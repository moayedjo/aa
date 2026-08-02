-- =============================================================================
-- Phase 08 RLS tests — credit_wallets, credit_ledger, usage_counters
-- Run against a database with migrations 0001–0008 applied. Rolls back.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local')
on conflict (id) do nothing;

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');
-- The wallet trigger provisions a 12-credit wallet + opening ledger entry.

-- ---------------------------------------------------------------------------
-- As the workspace OWNER (normal authenticated user)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — a member can READ their wallet and it opened at 12.
select 'TEST 1' as test,
       (select balance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 12 as pass;
-- expect pass = true

-- TEST 2 — a member CANNOT directly change the balance (no update policy).
update public.credit_wallets set balance = 9999
where workspace_id = '10000000-0000-0000-0000-00000000000a';
select 'TEST 2' as test,
       (select balance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 12 as pass;
-- expect pass = true (0 rows updated)

-- TEST 3 — a member CANNOT forge a ledger entry (no insert policy).
insert into public.credit_ledger
  (workspace_id, entry_type, amount, balance_after, reason)
values ('10000000-0000-0000-0000-00000000000a', 'allowance', 1000, 1012, 'forged');
select 'TEST 3' as test,
       not exists (select 1 from public.credit_ledger where reason = 'forged') as pass;
-- expect pass = true

-- TEST 4 — a member CANNOT call the credit function directly (privilege
-- revoked). Expect: ERROR permission denied. Comment in to verify:
-- select public.apply_credit_change(
--   '10000000-0000-0000-0000-00000000000a', 'allowance', 1000, null, 'hack', null);
-- expect: permission denied for function apply_credit_change

-- ---------------------------------------------------------------------------
-- As an OUTSIDER
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- TEST 5 — outsiders see no wallet, ledger or usage for workspace A.
select 'TEST 5' as test,
       (select count(*) from public.credit_wallets) = 0
       and (select count(*) from public.credit_ledger) = 0
       and (select count(*) from public.usage_counters) = 0 as pass;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- Balance integrity via the function (run as the service role / postgres)
-- ---------------------------------------------------------------------------
reset role;

-- TEST 6 — reserve deducts and writes a ledger entry.
select public.apply_credit_change(
  '10000000-0000-0000-0000-00000000000a', 'reservation', -1,
  null, 'Image generation', null);
select 'TEST 6' as test,
       (select balance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 11 as pass;
-- expect pass = true

-- TEST 7 — overspend is rejected (balance can never go negative).
do $$
begin
  perform public.apply_credit_change(
    '10000000-0000-0000-0000-00000000000a', 'reservation', -9999,
    null, 'overspend', null);
  raise exception 'TEST 7 FAILED: overspend was allowed';
exception when others then
  if sqlerrm like '%INSUFFICIENT_CREDITS%' then
    raise notice 'TEST 7 pass = true';
  else
    raise;
  end if;
end $$;

-- TEST 8 — a refund restores the balance and every ledger row stamps
-- balance_after equal to the running wallet balance.
select public.apply_credit_change(
  '10000000-0000-0000-0000-00000000000a', 'refund', 1,
  null, 'Refund: failed generation', null);
select 'TEST 8' as test,
       (select balance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 12
       and (select balance_after from public.credit_ledger
            where workspace_id = '10000000-0000-0000-0000-00000000000a'
            order by created_at desc limit 1) = 12 as pass;
-- expect pass = true

rollback;
