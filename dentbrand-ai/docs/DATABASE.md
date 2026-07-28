# DentBrand AI — Database

Supabase PostgreSQL. Versioned SQL migrations live in
`supabase/migrations/`; an applied migration is never edited — changes go
in a new migration. Tables are created only in the phase that needs them.

## Applied migrations

| Migration | Phase | Contents |
|---|---|---|
| `20260728000001_phase01_auth_workspaces.sql` | 01 | enums, profiles, user_roles, workspaces, workspace_members, helper functions, triggers, RLS |
| `20260728000002_phase02_brand_kit.sql` | 02 | brand_kits, workspace_industry_settings, private brand-assets storage bucket + policies |
| `20260728000003_phase03_verticals_templates.sql` | 03 | industry_verticals, services, content_goals, template_categories, templates, template_versions, template_services + dental catalog seed |

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

## Phase 02 schema

### `brand_kits`

One per workspace (`workspace_id` unique → workspaces, cascade). Brand
identity gathered during onboarding: `business_name`, `logo_path` (into
the brand-assets bucket), five hex-checked colors (`primary_color`,
`secondary_color`, `accent_color`, `background_color`, `text_color`),
`arabic_font`, `english_font`, contact info (`phone`, `website`,
`address`), `default_language` (`ar`/`en`), onboarding progress
(`onboarding_step`, `onboarding_completed_at`), timestamps.

### `workspace_industry_settings`

One per workspace: `industry_key` (default `dental`) and
`selected_services text[]`. Service keys reference the typed config in
`src/lib/industries/config.ts` until Phase 03 introduces the
database-backed verticals/services tables (keys stay stable).

### RLS (both tables)

select: workspace members + platform admin · insert/update: workspace
owner/admin · delete: owner. Anonymous: nothing.

### Storage — `brand-assets` bucket

Private; 2 MB limit; PNG/JPEG/SVG/WebP only. Object paths are
`{workspace_id}/…`; policies derive the workspace from the first path
segment: members read, owner/admin write/delete. Logos are served via
short-lived signed URLs only.

## Phase 03 schema

### Catalog: `industry_verticals`, `services`, `content_goals`, `template_categories`

Vertical-scoped reference data (`key`, `label_en`, `label_ar`,
`sort_order`; verticals add `is_available`). The dental vertical and its
services/goals/categories are seeded by migration 0003 with keys matching
the Phase 02 interim config, so stored workspace selections stay valid.
Read: all authenticated users. Write: platform admins only.

### `templates`

`vertical_id`, optional `category_id`, `name`, `description`, `status`
(enum `template_status`: draft → testing → approved → published →
archived), `current_version`, `supported_languages`, canvas dimensions,
`created_by`, timestamps. RLS: normal users see `published` rows only;
platform admins see and manage everything.

### `template_versions`

Immutable JSON snapshots: `template_id`, `version`
(unique per template), `template_json` (validated against the Zod schema
in `src/lib/templates/schema.ts` before every insert), `created_by`.
**No update or delete policies exist — not even for admins.** Edits create
a new version and move `templates.current_version`. Designs (Phase 04+)
reference `template_id` + `version`, so published designs never change
under a template update.

### `template_services`

Join table linking templates to the services they suit. Read:
authenticated; write: platform admins.

### Template JSON (schemaVersion 1)

`canvas` (width/height/backgroundColor), `layers` (text, image, shape,
logo, icon, group — each with position, size, zIndex, `editable` flag),
`supportedLanguages`. Strings may use `{{variables}}` from a fixed allowed
set (brand: colors, fonts, logoUrl, businessName, phone, website; content:
headline, bodyText, cta, generatedImage). Text layers carry
`maxCharacters` limits; static text can be `{en, ar}` pairs. Five seeded
production templates live in `supabase/seed.sql`.

## Tests

`supabase/tests/phase01_rls_tests.sql` — workspace isolation,
member/profile visibility, forged inserts, self-granted platform admin,
anonymous access. `supabase/tests/phase02_rls_tests.sql` — brand kit /
industry settings read vs. write role gates, plus documented storage
policy checks. `supabase/tests/phase03_rls_tests.sql` — catalog readability,
published-only visibility for normal users, admin capabilities, and version
immutability. Run in the Supabase SQL editor; all files roll back their
fixtures.

## Future tables (do NOT create early)

Phase 04–05:
design_projects, design_versions, design_assets, design_exports ·
Phase 06–07: prompt_templates, prompt_versions, ai_generations ·
Phase 08: credit_wallets, credit_ledger, usage_counters · Phase 09:
plans, subscriptions, billing_customers, webhook_events · Phase 10–11:
support_requests, design_ratings, product_events, admin_audit_logs.
