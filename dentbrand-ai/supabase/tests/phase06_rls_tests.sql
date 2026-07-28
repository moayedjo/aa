-- =============================================================================
-- Phase 06 RLS tests — prompt_templates, prompt_versions, ai_generations
-- Run against a database with migrations 0001–0006 applied and seed.sql
-- loaded. Rolls back all fixtures.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@test.local')
on conflict (id) do nothing;

update public.user_roles set role = 'platform_admin'
where user_id = '00000000-0000-0000-0000-00000000000c';

insert into public.workspaces (id, name, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Workspace A', '00000000-0000-0000-0000-00000000000a');

insert into public.design_projects
  (id, workspace_id, template_id, template_version, name, language, design_json, created_by)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001', 1,
  'AI design', 'en',
  '{"schemaVersion":1,"canvas":{"width":1080,"height":1350,"backgroundColor":"#ffffff"},"layers":[]}'::jsonb,
  '00000000-0000-0000-0000-00000000000a'
);

-- ---------------------------------------------------------------------------
-- As a NORMAL user (workspace owner, but not platform admin)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — prompts are INVISIBLE to normal users (platform IP; only the
-- server-side service role reads them for generation).
select 'TEST 1' as test,
       (select count(*) from public.prompt_templates) = 0
       and (select count(*) from public.prompt_versions) = 0 as pass;
-- expect pass = true

-- TEST 2 — an editor can insert a generation log for their workspace.
insert into public.ai_generations
  (workspace_id, design_id, kind, language, input, status, created_by)
values ('10000000-0000-0000-0000-00000000000a',
        '40000000-0000-0000-0000-000000000001',
        'copy', 'en', '{"service":"whitening"}'::jsonb, 'completed',
        '00000000-0000-0000-0000-00000000000a');
select 'TEST 2' as test, count(*) = 1 as pass from public.ai_generations;
-- expect pass = true

-- TEST 3 — generation logs are append-only (no update policy).
update public.ai_generations set status = 'failed';
select 'TEST 3' as test,
       (select status from public.ai_generations limit 1) = 'completed' as pass;
-- expect pass = true (0 rows updated)

-- ---------------------------------------------------------------------------
-- As an OUTSIDER
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- TEST 4 — other workspaces' generations are invisible.
select 'TEST 4' as test, count(*) = 0 as pass from public.ai_generations;
-- expect pass = true

-- TEST 5 — outsiders cannot insert generations into workspace A.
-- Expect: ERROR (RLS). Comment in to verify, then re-run:
-- insert into public.ai_generations
--   (workspace_id, kind, language, input, status, created_by)
-- values ('10000000-0000-0000-0000-00000000000a', 'copy', 'en',
--         '{}'::jsonb, 'completed', '00000000-0000-0000-0000-00000000000b');

-- ---------------------------------------------------------------------------
-- As the PLATFORM ADMIN
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

-- TEST 6 — platform admin reads prompts (2 templates, 2 versions seeded).
select 'TEST 6' as test,
       (select count(*) from public.prompt_templates) >= 2
       and (select count(*) from public.prompt_versions) >= 2 as pass;
-- expect pass = true

-- TEST 7 — prompt versions are immutable even for admins.
update public.prompt_versions set system_prompt = 'hacked';
select 'TEST 7' as test,
       (select count(*) from public.prompt_versions
        where system_prompt = 'hacked') = 0 as pass;
-- expect pass = true

rollback;
