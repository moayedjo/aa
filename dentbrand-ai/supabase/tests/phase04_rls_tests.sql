-- =============================================================================
-- Phase 04 RLS tests — design_projects, design_assets, design-assets storage
-- Run against a database with migrations 0001–0004 applied and seed.sql
-- loaded. Rolls back all fixtures.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'viewer-d@test.local')
on conflict (id) do nothing;

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');

-- D is a viewer in workspace A; B has no role at all.
insert into public.workspace_members (workspace_id, user_id, role)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'viewer');

insert into public.design_projects
  (id, workspace_id, template_id, template_version, name, language, design_json, created_by)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001', 1,
  'Test design', 'en',
  '{"schemaVersion":1,"canvas":{"width":1080,"height":1350,"backgroundColor":"#ffffff"},"layers":[]}'::jsonb,
  '00000000-0000-0000-0000-00000000000a'
);

-- ---------------------------------------------------------------------------
-- TEST 1 — outsiders cannot see the design.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select 'TEST 1' as test, count(*) = 0 as pass
from public.design_projects;
-- expect pass = true

-- TEST 2 — outsiders cannot update it either.
update public.design_projects set name = 'Hacked'
where id = '40000000-0000-0000-0000-000000000001';
select 'TEST 2' as test,
       not exists (select 1 from public.design_projects where name = 'Hacked') as pass;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- TEST 3 — a VIEWER member can read but not modify.
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';

select 'TEST 3a' as test, count(*) = 1 as pass
from public.design_projects;
-- expect pass = true

update public.design_projects set name = 'Viewer edit'
where id = '40000000-0000-0000-0000-000000000001';
select 'TEST 3b' as test,
       (select name from public.design_projects
        where id = '40000000-0000-0000-0000-000000000001') = 'Test design' as pass;
-- expect pass = true (0 rows updated)

-- TEST 4 — a viewer cannot create designs.
-- Expect: ERROR (RLS violation). Comment in to verify, then re-run.
-- insert into public.design_projects
--   (workspace_id, template_id, template_version, name, design_json, created_by)
-- values ('10000000-0000-0000-0000-00000000000a',
--         '30000000-0000-0000-0000-000000000001', 1, 'Forged',
--         '{}'::jsonb, '00000000-0000-0000-0000-00000000000d');

-- ---------------------------------------------------------------------------
-- TEST 5 — the OWNER can create and update.
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

update public.design_projects set name = 'Renamed'
where id = '40000000-0000-0000-0000-000000000001';
select 'TEST 5' as test,
       (select name from public.design_projects
        where id = '40000000-0000-0000-0000-000000000001') = 'Renamed' as pass;
-- expect pass = true

-- TEST 6 — design_assets follow the same isolation.
insert into public.design_assets (workspace_id, design_id, storage_path, mime_type, created_by)
values ('10000000-0000-0000-0000-00000000000a',
        '40000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-000000000001/img-1.png',
        'image/png', '00000000-0000-0000-0000-00000000000a');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select 'TEST 6' as test, count(*) = 0 as pass from public.design_assets;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- Storage policy checks (documented — run via the storage API):
-- 1. Editor/admin/owner of workspace A can upload to
--    'design-assets/{A}/{designId}/x.png'; viewer D gets 403.
-- 2. Viewer D can DOWNLOAD workspace A design assets (read policy).
-- 3. User B (no role) can neither upload nor download under {A}/….
-- 4. Unauthenticated requests fail (private bucket).
-- ---------------------------------------------------------------------------

rollback;
