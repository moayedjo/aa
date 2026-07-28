# DentBrand AI — Database

Supabase PostgreSQL. Versioned SQL migrations live in
`supabase/migrations/`; an applied migration is never edited — changes go
in a new migration. Tables are created only in the phase that needs them.

## Applied migrations

| Migration | Phase | Contents |
|---|---|---|
| `20260728000001_phase01_auth_workspaces.sql` | 01 | enums, profiles, user_roles, workspaces, workspace_members, helper functions, triggers, RLS |

## Phase 01 schema

### Enums

- `platform_role`: `platform_admin` \| `user`
- `workspace_role`: `owner` \| `admin` \| `editor` \| `viewer`

### `profiles`

One row per auth user. `id` references `auth.users` (cascade). Created by
the `on_auth_user_created` trigger — no client insert path. Columns:
`id`, `email`, `full_name`, `created_at`, `updated_at`.

### `user_roles`

Platform-level role per user (`user_id` PK → auth.users). Default `user`,
inserted by the signup trigger. **No RLS write policies** — only the
service role can grant `platform_admin`.

### `workspaces`

`id`, `name` (2–80 chars), `created_by` → auth.users, timestamps. On
insert, the `on_workspace_created` trigger adds the creator to
`workspace_members` as `owner` atomically.

### `workspace_members`

`id`, `workspace_id` → workspaces (cascade), `user_id` → auth.users
(cascade), `role workspace_role` (default `editor`), `created_at`,
`unique(workspace_id, user_id)`. Indexed on `user_id` and `workspace_id`.

## Helper functions (security definer, `search_path = public`)

- `is_platform_admin()` — checks `user_roles`, never client metadata.
- `is_workspace_member(ws_id)` — membership test without RLS recursion.
- `my_workspace_role(ws_id)` — current user's role in a workspace.
- `shares_workspace_with(other_user)` — used by the profiles read policy.

## RLS summary (default deny; policies for `authenticated` role)

| Table | select | insert | update | delete |
|---|---|---|---|---|
| profiles | own, workspace peers, platform admin | — (trigger only) | own | — |
| user_roles | own, platform admin | — | — | — |
| workspaces | members, platform admin | self as `created_by` | owner/admin | owner |
| workspace_members | members of that workspace, platform admin | owner/admin (owner role grantable only by owner) | owner/admin (owner row untouchable by admins) | owner/admin; members may remove themselves (except owner) |

Anonymous (`anon`) has no policies on any table → sees nothing.

## Tests

`supabase/tests/phase01_rls_tests.sql` — documented SQL tests covering
workspace isolation, member/profile visibility, forged inserts,
self-granted platform admin, and anonymous access. Run in the Supabase SQL
editor; the file rolls back its fixtures.

## Future tables (do NOT create early)

Phase 02: brand_kits, workspace_industry_settings · Phase 03:
industry_verticals, services, content_goals, template_categories,
templates, template_services, template_versions · Phase 04–05:
design_projects, design_versions, design_assets, design_exports ·
Phase 06–07: prompt_templates, prompt_versions, ai_generations ·
Phase 08: credit_wallets, credit_ledger, usage_counters · Phase 09:
plans, subscriptions, billing_customers, webhook_events · Phase 10–11:
support_requests, design_ratings, product_events, admin_audit_logs.
