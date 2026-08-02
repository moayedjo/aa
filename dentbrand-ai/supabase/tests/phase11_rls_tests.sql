-- =============================================================================
-- Phase 11 RLS tests — admin_audit_logs, admin_adjust_credits
-- Run against a database with migrations 0001–0011 applied. Rolls back.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@test.local')
on conflict (id) do nothing;

update public.user_roles set role = 'platform_admin'
where user_id = '00000000-0000-0000-0000-00000000000c';

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');
-- Wallet trigger provisions 12 credits.

-- ---------------------------------------------------------------------------
-- As a NORMAL user (workspace owner, not platform admin)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — a normal user cannot read the audit log.
select 'TEST 1' as test, count(*) = 0 as pass from public.admin_audit_logs;
-- expect pass = true

-- TEST 2 — a normal user cannot call the audited adjustment function.
-- Expect: ERROR permission denied. Comment in to verify:
-- select public.admin_adjust_credits(
--   '10000000-0000-0000-0000-00000000000a', 100, 'hack',
--   '00000000-0000-0000-0000-00000000000a');

-- TEST 3 — a normal user cannot call the generic audit writer either.
-- Expect: ERROR permission denied. Comment in to verify:
-- select public.record_admin_action(
--   '00000000-0000-0000-0000-00000000000a', 'x', 'y', null, null, '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- Service role / postgres: the audited adjustment path
-- ---------------------------------------------------------------------------
reset role;

-- TEST 4 — admin_adjust_credits changes the balance AND writes an audit row,
-- atomically. Grant +10.
select public.admin_adjust_credits(
  '10000000-0000-0000-0000-00000000000a', 10, 'Goodwill',
  '00000000-0000-0000-0000-00000000000c');
select 'TEST 4' as test,
       (select balance from public.credit_wallets
        where workspace_id = '10000000-0000-0000-0000-00000000000a') = 22
       and exists (
         select 1 from public.admin_audit_logs
         where action = 'credit_adjustment'
           and workspace_id = '10000000-0000-0000-0000-00000000000a'
           and (details->>'amount')::int = 10
       )
       and exists (
         select 1 from public.credit_ledger
         where workspace_id = '10000000-0000-0000-0000-00000000000a'
           and entry_type = 'adjustment' and amount = 10
       ) as pass;
-- expect pass = true (12 + 10 = 22, ledger + audit both written)

-- TEST 5 — an adjustment that would go below zero is rejected (and writes
-- neither a ledger nor an audit row — one transaction).
do $$
begin
  perform public.admin_adjust_credits(
    '10000000-0000-0000-0000-00000000000a', -9999, 'too much',
    '00000000-0000-0000-0000-00000000000c');
  raise exception 'TEST 5 FAILED: overspend adjustment allowed';
exception when others then
  if sqlerrm like '%INSUFFICIENT_CREDITS%' then
    raise notice 'TEST 5 pass = true';
  else raise;
  end if;
end $$;

select 'TEST 5b' as test,
       not exists (
         select 1 from public.admin_audit_logs
         where (details->>'reason') = 'too much'
       ) as pass;
-- expect pass = true (failed adjustment left no audit row)

-- ---------------------------------------------------------------------------
-- As the PLATFORM ADMIN
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

-- TEST 6 — the platform admin can read the audit log.
select 'TEST 6' as test, count(*) >= 1 as pass from public.admin_audit_logs;
-- expect pass = true

rollback;
