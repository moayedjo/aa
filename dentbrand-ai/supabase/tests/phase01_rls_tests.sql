-- =============================================================================
-- Phase 01 RLS tests
-- Run in the Supabase SQL editor (or psql as postgres) against a database
-- where migration 20260728000001 is applied. Each block simulates a JWT
-- with `set local` inside a transaction, so nothing persists.
--
-- Expected results are stated inline. A failing expectation means the RLS
-- policies regressed — do not ship.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Setup: two fake users and one workspace each. Run as postgres (bypasses
-- RLS) so the fixtures exist regardless of policies.
-- ---------------------------------------------------------------------------
begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'user-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local')
on conflict (id) do nothing;
-- The on_auth_user_created trigger creates profiles + user_roles rows.

insert into public.workspaces (id, name, created_by)
values
  ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b', 'Workspace B', '00000000-0000-0000-0000-00000000000b');
-- The on_workspace_created trigger adds each creator as owner.

-- ---------------------------------------------------------------------------
-- TEST 1 — workspace isolation (SELECT)
-- As user A: expect exactly 1 row, 'Workspace A'. Seeing Workspace B is a
-- CRITICAL failure.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select 'TEST 1' as test, count(*) = 1 as pass
from public.workspaces;  -- expect pass = true

-- ---------------------------------------------------------------------------
-- TEST 2 — member list isolation
-- As user A: expect only members of Workspace A (1 row).
-- ---------------------------------------------------------------------------
select 'TEST 2' as test,
       count(*) = 1
       and bool_and(workspace_id = '10000000-0000-0000-0000-00000000000a') as pass
from public.workspace_members;  -- expect pass = true

-- ---------------------------------------------------------------------------
-- TEST 3 — cannot read another user's profile without a shared workspace
-- As user A: expect only own profile.
-- ---------------------------------------------------------------------------
select 'TEST 3' as test,
       count(*) = 1
       and bool_and(id = '00000000-0000-0000-0000-00000000000a') as pass
from public.profiles;  -- expect pass = true

-- ---------------------------------------------------------------------------
-- TEST 4 — cannot insert a workspace as someone else
-- Expect: ERROR (RLS violation). Comment in to verify, then re-run the file.
-- ---------------------------------------------------------------------------
-- insert into public.workspaces (name, created_by)
-- values ('Forged', '00000000-0000-0000-0000-00000000000b');
-- expect: new row violates row-level security policy

-- ---------------------------------------------------------------------------
-- TEST 5 — cannot add yourself to a foreign workspace
-- Expect: ERROR (RLS violation). Comment in to verify.
-- ---------------------------------------------------------------------------
-- insert into public.workspace_members (workspace_id, user_id, role)
-- values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'admin');
-- expect: new row violates row-level security policy

-- ---------------------------------------------------------------------------
-- TEST 6 — cannot grant yourself platform_admin
-- Expect: ERROR (no insert/update policy on user_roles).
-- ---------------------------------------------------------------------------
-- update public.user_roles set role = 'platform_admin'
-- where user_id = '00000000-0000-0000-0000-00000000000a';
-- expect: 0 rows updated (no update policy)

-- ---------------------------------------------------------------------------
-- TEST 7 — anonymous users see nothing
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{}';

select 'TEST 7' as test,
       (select count(*) from public.workspaces) = 0
       and (select count(*) from public.profiles) = 0
       and (select count(*) from public.workspace_members) = 0 as pass;
-- expect pass = true

rollback;
