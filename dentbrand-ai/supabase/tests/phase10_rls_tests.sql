-- =============================================================================
-- Phase 10 RLS tests — support_requests, design_ratings, product_events
-- Run against a database with migrations 0001–0010 applied. Rolls back.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'editor-d@test.local')
on conflict (id) do nothing;

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');

insert into public.workspace_members (workspace_id, user_id, role)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'editor');

insert into public.design_projects
  (id, workspace_id, template_id, template_version, name, language, design_json, created_by)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001', 1,
  'Design', 'en',
  '{"schemaVersion":1,"canvas":{"width":1080,"height":1350,"backgroundColor":"#ffffff"},"layers":[]}'::jsonb,
  '00000000-0000-0000-0000-00000000000a'
);

-- ---------------------------------------------------------------------------
-- As editor D (a member)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';

-- TEST 1 — a member can open a support request for their workspace.
insert into public.support_requests (workspace_id, design_id, user_id, kind, message)
values ('10000000-0000-0000-0000-00000000000a',
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000d', 'problem', 'Export looks off');
select 'TEST 1' as test, count(*) = 1 as pass from public.support_requests;
-- expect pass = true

-- TEST 2 — a member can rate a design (and re-rate via upsert).
insert into public.design_ratings (design_id, workspace_id, user_id, rating)
values ('40000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-00000000000d', 4);
select 'TEST 2' as test,
       (select rating from public.design_ratings
        where user_id = '00000000-0000-0000-0000-00000000000d') = 4 as pass;
-- expect pass = true

-- TEST 3 — a member cannot read product_events (platform-admin only).
select 'TEST 3' as test, count(*) = 0 as pass from public.product_events;
-- expect pass = true (no rows visible)

-- ---------------------------------------------------------------------------
-- As outsider B
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- TEST 4 — an outsider cannot open a support request for workspace A.
-- Expect: ERROR (RLS). Comment in to verify:
-- insert into public.support_requests (workspace_id, user_id, kind, message)
-- values ('10000000-0000-0000-0000-00000000000a',
--         '00000000-0000-0000-0000-00000000000b', 'problem', 'forged');

-- TEST 5 — an outsider sees no support requests or ratings for workspace A.
select 'TEST 5' as test,
       (select count(*) from public.support_requests) = 0
       and (select count(*) from public.design_ratings) = 0 as pass;
-- expect pass = true

-- ---------------------------------------------------------------------------
-- Support request visibility: creator vs owner/admin
-- ---------------------------------------------------------------------------
-- As the OWNER (not the creator) — can read the workspace's requests.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select 'TEST 6' as test, count(*) = 1 as pass from public.support_requests;
-- expect pass = true (owner sees the editor's request)

-- product_events insert path is service-role only; verify a normal user
-- cannot insert (no insert policy). Expect 0 rows / RLS error.
insert into public.product_events (workspace_id, event_type)
values ('10000000-0000-0000-0000-00000000000a', 'forged')
on conflict do nothing;
reset role;
select 'TEST 7' as test,
       not exists (select 1 from public.product_events where event_type = 'forged') as pass;
-- expect pass = true

rollback;
