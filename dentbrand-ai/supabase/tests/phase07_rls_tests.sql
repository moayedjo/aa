-- =============================================================================
-- Phase 07 RLS tests — image generations, reservations, idempotency
-- Run against a database with migrations 0001–0007 applied and seed.sql
-- loaded. Rolls back all fixtures.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local')
on conflict (id) do nothing;

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');

insert into public.design_projects
  (id, workspace_id, template_id, template_version, name, language, design_json, created_by)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001', 1,
  'Image design', 'en',
  '{"schemaVersion":1,"canvas":{"width":1080,"height":1350,"backgroundColor":"#ffffff"},"layers":[]}'::jsonb,
  '00000000-0000-0000-0000-00000000000a'
);

-- ---------------------------------------------------------------------------
-- As the workspace OWNER
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — reserve: an editor can create a PENDING image generation.
insert into public.ai_generations
  (id, workspace_id, design_id, kind, language, input, status, idempotency_key, created_by)
values ('60000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-00000000000a',
        '40000000-0000-0000-0000-000000000001',
        'image', 'en', '{"prompt":"clinic"}'::jsonb, 'pending',
        'test-idem-key-0001', '00000000-0000-0000-0000-00000000000a');
select 'TEST 1' as test, count(*) = 1 as pass
from public.ai_generations where status = 'pending';
-- expect pass = true

-- TEST 2 — idempotency: the same key cannot reserve twice.
-- Expect: ERROR (unique violation). Comment in to verify, then re-run:
-- insert into public.ai_generations
--   (workspace_id, design_id, kind, language, input, status, idempotency_key, created_by)
-- values ('10000000-0000-0000-0000-00000000000a',
--         '40000000-0000-0000-0000-000000000001',
--         'image', 'en', '{}'::jsonb, 'pending',
--         'test-idem-key-0001', '00000000-0000-0000-0000-00000000000a');
-- expect: duplicate key value violates unique constraint

-- TEST 3 — confirm: the creator can finish their own pending row.
update public.ai_generations
set status = 'completed', asset_path = '10000000-0000-0000-0000-00000000000a/x/ai-1.png'
where id = '60000000-0000-0000-0000-000000000001';
select 'TEST 3' as test,
       (select status from public.ai_generations
        where id = '60000000-0000-0000-0000-000000000001') = 'completed' as pass;
-- expect pass = true

-- TEST 4 — completed rows are immutable (refund/charge history is final).
update public.ai_generations
set status = 'failed'
where id = '60000000-0000-0000-0000-000000000001';
select 'TEST 4' as test,
       (select status from public.ai_generations
        where id = '60000000-0000-0000-0000-000000000001') = 'completed' as pass;
-- expect pass = true (0 rows updated)

-- ---------------------------------------------------------------------------
-- As an OUTSIDER
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- TEST 5 — outsiders cannot finish (steal) someone else's pending rows.
insert into public.ai_generations
  (id, workspace_id, design_id, kind, language, input, status, idempotency_key, created_by)
values ('60000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-00000000000a',
        null, 'image', 'en', '{}'::jsonb, 'pending', 'test-idem-key-0002',
        '00000000-0000-0000-0000-00000000000a')
on conflict do nothing;
-- (insert above fails silently under RLS — create as postgres instead)
reset role;
insert into public.ai_generations
  (id, workspace_id, design_id, kind, language, input, status, idempotency_key, created_by)
values ('60000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-00000000000a',
        null, 'image', 'en', '{}'::jsonb, 'pending', 'test-idem-key-0002',
        '00000000-0000-0000-0000-00000000000a')
on conflict (id) do nothing;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

update public.ai_generations
set status = 'failed'
where id = '60000000-0000-0000-0000-000000000002';

reset role;
select 'TEST 5' as test,
       (select status from public.ai_generations
        where id = '60000000-0000-0000-0000-000000000002') = 'pending' as pass;
-- expect pass = true (outsider's update touched 0 rows)

rollback;
