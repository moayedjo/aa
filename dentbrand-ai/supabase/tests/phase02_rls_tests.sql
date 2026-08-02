-- =============================================================================
-- Phase 02 RLS tests — brand_kits, workspace_industry_settings, brand-assets
-- Run against a database with migrations 0001 + 0002 applied. Uses the same
-- fixture pattern as phase01_rls_tests.sql; everything rolls back.
-- =============================================================================

begin;

-- Fixtures (as postgres, bypassing RLS): two users, two workspaces, and a
-- brand kit + settings for workspace B only.
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'user-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local')
on conflict (id) do nothing;

insert into public.workspaces (id, name, created_by)
values
  ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b', 'Workspace B', '00000000-0000-0000-0000-00000000000b');

insert into public.brand_kits (workspace_id, business_name)
values ('10000000-0000-0000-0000-00000000000b', 'Clinic B');

insert into public.workspace_industry_settings (workspace_id, selected_services)
values ('10000000-0000-0000-0000-00000000000b', array['teeth-whitening']);

-- Make user A a *viewer* in workspace B to test the role gate on writes.
insert into public.workspace_members (workspace_id, user_id, role)
values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'viewer');

-- ---------------------------------------------------------------------------
-- Act as user A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — members can READ the brand kit of a workspace they belong to
-- (A is viewer in B, so Clinic B is visible).
select 'TEST 1' as test, count(*) = 1 as pass
from public.brand_kits
where workspace_id = '10000000-0000-0000-0000-00000000000b';
-- expect pass = true

-- TEST 2 — a viewer cannot UPDATE the brand kit (owner/admin only).
update public.brand_kits
set business_name = 'Hacked'
where workspace_id = '10000000-0000-0000-0000-00000000000b';
select 'TEST 2' as test,
       (select business_name from public.brand_kits
        where workspace_id = '10000000-0000-0000-0000-00000000000b') = 'Clinic B' as pass;
-- expect pass = true (0 rows updated)

-- TEST 3 — a viewer cannot INSERT a brand kit for their own workspace A?
-- A is OWNER of workspace A, so this must SUCCEED.
insert into public.brand_kits (workspace_id, business_name)
values ('10000000-0000-0000-0000-00000000000a', 'Clinic A');
select 'TEST 3' as test, count(*) = 1 as pass
from public.brand_kits
where workspace_id = '10000000-0000-0000-0000-00000000000a';
-- expect pass = true

-- TEST 4 — industry settings of a foreign-role workspace are readable but
-- not writable for a viewer.
update public.workspace_industry_settings
set selected_services = array['forged']
where workspace_id = '10000000-0000-0000-0000-00000000000b';
select 'TEST 4' as test,
       (select selected_services from public.workspace_industry_settings
        where workspace_id = '10000000-0000-0000-0000-00000000000b') = array['teeth-whitening'] as pass;
-- expect pass = true

-- TEST 5 — cannot create a brand kit for a workspace you have no role in.
-- Expect: ERROR (RLS). Comment in to verify, then re-run the file.
-- set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
-- insert into public.brand_kits (workspace_id, business_name)
-- values ('10000000-0000-0000-0000-00000000000a', 'Forged');
-- expect: new row violates row-level security policy

-- ---------------------------------------------------------------------------
-- Storage policy checks (documented — storage API calls can't run in SQL):
-- 1. As workspace A's owner, uploading to  'brand-assets/{A}/logo.png' succeeds.
-- 2. As user B (no role in A), uploading to 'brand-assets/{A}/x.png' fails 403.
-- 3. As a viewer of B, downloading 'brand-assets/{B}/…' succeeds (read policy).
-- 4. As a viewer of B, uploading to 'brand-assets/{B}/…' fails 403 (write is
--    owner/admin only).
-- 5. Unauthenticated requests to any brand-assets object fail (private bucket).
-- ---------------------------------------------------------------------------

rollback;
