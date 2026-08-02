-- =============================================================================
-- Phase 05 RLS tests — design_versions, design_exports, soft delete
-- Run against a database with migrations 0001–0005 applied and seed.sql
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

insert into public.workspace_members (workspace_id, user_id, role)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'viewer');

insert into public.design_projects
  (id, workspace_id, template_id, template_version, name, language, design_json, created_by)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001', 1,
  'Versioned design', 'en',
  '{"schemaVersion":1,"canvas":{"width":1080,"height":1350,"backgroundColor":"#ffffff"},"layers":[]}'::jsonb,
  '00000000-0000-0000-0000-00000000000a'
);

insert into public.design_versions (design_id, version, kind, design_json, created_by)
values ('40000000-0000-0000-0000-000000000001', 1, 'manual',
        '{"schemaVersion":1}'::jsonb, '00000000-0000-0000-0000-00000000000a');

-- ---------------------------------------------------------------------------
-- As the OWNER of workspace A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — owner reads versions and can add new ones.
insert into public.design_versions (design_id, version, kind, design_json, created_by)
values ('40000000-0000-0000-0000-000000000001', 2, 'checkpoint',
        '{"schemaVersion":1}'::jsonb, '00000000-0000-0000-0000-00000000000a');
select 'TEST 1' as test, count(*) = 2 as pass from public.design_versions;
-- expect pass = true

-- TEST 2 — versions are immutable even for the owner (no update policy).
update public.design_versions set design_json = '{}'::jsonb where version = 1;
select 'TEST 2' as test,
       (select design_json from public.design_versions where version = 1)
       = '{"schemaVersion":1}'::jsonb as pass;
-- expect pass = true (0 rows updated)

-- TEST 3 — versions cannot be deleted (no delete policy).
delete from public.design_versions where version = 1;
select 'TEST 3' as test, count(*) = 2 as pass from public.design_versions;
-- expect pass = true

-- TEST 4 — export records can be inserted by editors.
insert into public.design_exports
  (design_id, workspace_id, format, width, height, status, created_by)
values ('40000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-00000000000a',
        'png', 1080, 1350, 'completed', '00000000-0000-0000-0000-00000000000a');
select 'TEST 4' as test, count(*) = 1 as pass from public.design_exports;
-- expect pass = true

-- TEST 5 — soft delete works via update (trash), design stays queryable.
update public.design_projects set deleted_at = now()
where id = '40000000-0000-0000-0000-000000000001';
select 'TEST 5' as test,
       (select deleted_at is not null from public.design_projects
        where id = '40000000-0000-0000-0000-000000000001') as pass;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- As an OUTSIDER (no role in workspace A)
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- TEST 6 — versions and exports are invisible.
select 'TEST 6' as test,
       (select count(*) from public.design_versions) = 0
       and (select count(*) from public.design_exports) = 0 as pass;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- As a VIEWER of workspace A
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';

-- TEST 7 — viewers read versions but cannot create them.
select 'TEST 7a' as test, count(*) = 2 as pass from public.design_versions;
-- expect pass = true
-- Expect: ERROR (RLS). Comment in to verify, then re-run:
-- insert into public.design_versions (design_id, version, kind, design_json, created_by)
-- values ('40000000-0000-0000-0000-000000000001', 3, 'manual',
--         '{}'::jsonb, '00000000-0000-0000-0000-00000000000d');

rollback;
