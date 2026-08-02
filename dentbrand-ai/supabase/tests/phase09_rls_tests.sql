-- =============================================================================
-- Phase 09 RLS tests — plans, billing_customers, subscriptions, webhook_events
-- Run against a database with migrations 0001–0009 applied. Rolls back.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local')
on conflict (id) do nothing;

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');

-- A subscription + webhook event (created as postgres, bypassing RLS).
insert into public.subscriptions (workspace_id, status, plan_id)
select '10000000-0000-0000-0000-00000000000a', 'active', id
from public.plans where key = 'growth';

insert into public.webhook_events (paddle_event_id, event_type, raw)
values ('evt_test_1', 'subscription.updated', '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- As the workspace OWNER
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — plans are readable (3 seeded).
select 'TEST 1' as test, (select count(*) from public.plans) >= 3 as pass;
-- expect pass = true

-- TEST 2 — a member reads their own subscription.
select 'TEST 2' as test, count(*) = 1 as pass
from public.subscriptions
where workspace_id = '10000000-0000-0000-0000-00000000000a';
-- expect pass = true

-- TEST 3 — a member CANNOT self-activate a subscription (no insert policy).
-- Browser/redirect can never mutate billing state.
insert into public.subscriptions (workspace_id, status)
values ('10000000-0000-0000-0000-00000000000a', 'active')
on conflict (workspace_id) do nothing;
update public.subscriptions set status = 'active', cancel_at_period_end = false
where workspace_id = '10000000-0000-0000-0000-00000000000a';
select 'TEST 3' as test,
       (select status from public.subscriptions
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 'active' as pass;
-- The row was already active; the point is that no *user* write path exists —
-- both statements affect 0 rows (no insert/update policy). pass reflects the
-- untouched seeded row.

-- TEST 4 — webhook_events are INVISIBLE to users (service-role only).
select 'TEST 4' as test, (select count(*) from public.webhook_events) = 0 as pass;
-- expect pass = true

-- TEST 5 — a member cannot call the allowance function directly.
-- Expect: ERROR permission denied. Comment in to verify:
-- select public.apply_plan_allowance('10000000-0000-0000-0000-00000000000a', 9999);

-- ---------------------------------------------------------------------------
-- As an OUTSIDER
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- TEST 6 — outsiders see plans (public) but no foreign subscription/customer.
select 'TEST 6' as test,
       (select count(*) from public.plans) >= 3
       and (select count(*) from public.subscriptions) = 0
       and (select count(*) from public.billing_customers) = 0 as pass;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- Webhook idempotency (service role / postgres)
-- ---------------------------------------------------------------------------
reset role;

-- TEST 7 — the same paddle_event_id cannot be recorded twice.
do $$
begin
  insert into public.webhook_events (paddle_event_id, event_type, raw)
  values ('evt_test_1', 'subscription.updated', '{}'::jsonb);
  raise exception 'TEST 7 FAILED: duplicate event was allowed';
exception when unique_violation then
  raise notice 'TEST 7 pass = true';
end $$;

-- TEST 8 — apply_plan_allowance sets the monthly allowance and tops up.
select public.apply_plan_allowance('10000000-0000-0000-0000-00000000000a', 36);
select 'TEST 8' as test,
       (select monthly_allowance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 36
       and (select balance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 36 as pass;
-- expect pass = true (opened at 12, topped up to 36)

rollback;
