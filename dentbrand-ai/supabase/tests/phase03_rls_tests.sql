-- =============================================================================
-- Phase 03 RLS tests — catalog, templates, template_versions
-- Run against a database with migrations 0001–0003 applied (catalog seed
-- included) and seed.sql loaded. Rolls back all fixtures.
-- =============================================================================

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'user-a@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@test.local')
on conflict (id) do nothing;

-- Promote one fixture user to platform admin (as postgres; the whole point
-- is that users can never do this themselves).
update public.user_roles set role = 'platform_admin'
where user_id = '00000000-0000-0000-0000-00000000000c';

-- One draft template next to the published seed templates.
insert into public.templates (id, vertical_id, name, status, current_version)
values ('30000000-0000-0000-0000-0000000000aa',
        '20000000-0000-0000-0000-000000000001',
        'Unreleased draft', 'draft', 1);

insert into public.template_versions (template_id, version, template_json)
values ('30000000-0000-0000-0000-0000000000aa', 1, '{"schemaVersion":1}'::jsonb);

-- ---------------------------------------------------------------------------
-- As a NORMAL user
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- TEST 1 — catalog data is readable.
select 'TEST 1' as test,
       (select count(*) from public.industry_verticals) >= 1
       and (select count(*) from public.services) >= 10
       and (select count(*) from public.content_goals) >= 6
       and (select count(*) from public.template_categories) >= 5 as pass;
-- expect pass = true

-- TEST 2 — normal users see PUBLISHED templates only (no drafts).
select 'TEST 2' as test,
       count(*) filter (where status <> 'published') = 0
       and count(*) >= 5 as pass
from public.templates;
-- expect pass = true

-- TEST 3 — draft template versions are invisible to normal users.
select 'TEST 3' as test, count(*) = 0 as pass
from public.template_versions
where template_id = '30000000-0000-0000-0000-0000000000aa';
-- expect pass = true

-- TEST 4 — normal users cannot write catalog or templates.
update public.templates set name = 'Hacked' where name = 'Service Spotlight';
select 'TEST 4' as test,
       (select count(*) from public.templates where name = 'Hacked') = 0 as pass;
-- expect pass = true (0 rows updated)

-- TEST 5 — normal users cannot insert template versions.
-- Expect: ERROR (RLS violation). Comment in to verify, then re-run.
-- insert into public.template_versions (template_id, version, template_json)
-- values ('30000000-0000-0000-0000-000000000001', 99, '{}'::jsonb);
-- expect: new row violates row-level security policy

-- ---------------------------------------------------------------------------
-- As the PLATFORM ADMIN
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

-- TEST 6 — admin sees drafts too.
select 'TEST 6' as test, count(*) = 1 as pass
from public.templates
where id = '30000000-0000-0000-0000-0000000000aa';
-- expect pass = true

-- TEST 7 — admin can update template status.
update public.templates set status = 'testing'
where id = '30000000-0000-0000-0000-0000000000aa';
select 'TEST 7' as test,
       (select status from public.templates
        where id = '30000000-0000-0000-0000-0000000000aa') = 'testing' as pass;
-- expect pass = true

-- TEST 8 — even the admin cannot UPDATE an existing version (immutability;
-- no update policy exists). Expect 0 rows updated.
update public.template_versions set template_json = '{}'::jsonb
where template_id = '30000000-0000-0000-0000-0000000000aa';
select 'TEST 8' as test,
       (select template_json from public.template_versions
        where template_id = '30000000-0000-0000-0000-0000000000aa')
       = '{"schemaVersion":1}'::jsonb as pass;
-- expect pass = true

rollback;
