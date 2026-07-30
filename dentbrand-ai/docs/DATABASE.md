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
| `20260728000004_phase04_design_projects.sql` | 04 | design_projects, design_assets, private design-assets storage bucket + policies |
| `20260728000005_phase05_versions_exports.sql` | 05 | design_versions (immutable), design_exports, deleted_at soft delete on design_projects |
| `20260728000006_phase06_ai_copy.sql` | 06 | prompt_templates, prompt_versions (immutable), ai_generations + dental prompt seed |
| `20260728000007_phase07_ai_images.sql` | 07 | ai_generations gains image kind, pending status, idempotency key, asset_path; generated design assets; reservation-finish policy |
| `20260728000008_phase08_credits.sql` | 08 | credit_wallets, credit_ledger (append-only), usage_counters + balance-integrity functions, wallet provisioning trigger |
| `20260728000009_phase09_billing.sql` | 09 | plans (seeded), billing_customers, subscriptions, webhook_events + apply_plan_allowance |
| `20260728000010_phase10_support.sql` | 10 | support_requests, design_ratings, product_events + RLS |

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

## Phase 04 schema

### `design_projects`

A workspace's designs: `workspace_id`, **immutable template reference**
(`template_id` + `template_version` pin the exact snapshot the design was
created from), `name`, `language` (`ar`/`en`), `design_json` (the concrete
working state — validated against `src/lib/designs/schema.ts` on save),
`created_by`, timestamps. RLS: members read; owner/admin/editor
create/update; owner/admin delete (viewers are read-only).

### `design_assets`

Uploaded design images: `workspace_id`, optional `design_id`,
`storage_path` (into the design-assets bucket), `kind`, `mime_type`,
`created_by`. Same read isolation; editors create; owner/admin delete.

### Design JSON (schemaVersion 1)

Same layer vocabulary as templates but fully resolved: no `{{variables}}`,
hex colors, plain strings, and image/logo sources restricted to internal
`supabase://bucket/path` references (never external URLs). Groups are
flattened at creation; `editable` flags carry over so locked layers stay
locked in the editor.

### Storage — `design-assets` bucket

Private; 5 MB; PNG/JPEG/WebP. Paths are `{workspace_id}/{design_id}/…`;
members read, owner/admin/editor upload, owner/admin delete. Assets are
served via short-lived signed URLs resolved server-side per editor load.

## Phase 05 schema

### `design_versions`

Immutable snapshots of a design's working state: `design_id`, `version`
(unique per design), `kind` (`checkpoint` = automatic every N autosaves,
`manual` = user pressed "Save version", `pre-restore` = automatic snapshot
taken before any restore), `design_json`, `created_by`. **No update or
delete policies** — history cannot be rewritten. Restore always snapshots
the current state first, so restoring never destroys work.

### `design_exports`

One row per export attempt (successes AND failures — the Export Success
Rate metric needs both): `design_id`, `workspace_id`, `format` (png),
`width`, `height`, `status`, optional `error`, `created_by`.

### Soft delete

`design_projects.deleted_at` — set = in Trash (hidden from lists, editor
redirects away), null = active. Restore clears it; permanent delete is a
real DELETE restricted to owner/admin by RLS.

## Phase 06 schema

### `prompt_templates` / `prompt_versions`

Vertical-scoped, versioned AI prompts (`key`, `kind`, `current_version`;
versions hold `system_prompt` + `user_prompt_template` with
`{{placeholders}}`). **RLS hides prompts from all user sessions** —
platform admins manage them; the generation server action reads the
current version via the audited service-role client. Versions are
immutable (no update/delete policies). Two dental prompts are seeded:
`social-copy` (full pack) and `social-copy-field` (single-field
regenerate/transform).

### `ai_generations`

Append-only log of every AI call: workspace/design, `kind` (copy),
prompt template + version used, language, sanitized `input`, validated
`output` (null on failure), `status`, `error`, `model`, `duration_ms`,
`created_by`. Members read their workspace's rows; editors insert; no
update/delete. Successful full packs double as the "previous results"
history in the editor.

## Phase 07 schema (extends Phase 06)

`ai_generations` is extended rather than duplicated:

- `kind` now accepts `image` alongside `copy`.
- `status` now accepts `pending` — **a pending row IS the credit
  reservation**. It becomes `completed` (charge confirmed) or `failed`
  (reservation refunded); it is never deleted.
- `idempotency_key` with a unique partial index: a duplicate submission
  cannot create a second reservation, so it cannot be charged twice.
- `asset_path` holds the stored image's path in the design-assets bucket.
- `design_assets.kind` now accepts `generated` next to `upload`.

New RLS policy `ai_generations: finish own pending` lets the creator move
**their own pending row** to completed/failed while they still hold an
editor role. Completed and failed rows remain immutable (the `using`
clause only matches `pending`), so charge/refund history is final.

## Phase 08 schema

### `credit_wallets`

One per workspace: `balance` (spendable image credits, `>= 0`),
`monthly_allowance`, `allowance_period` (`YYYY-MM`). Provisioned by a
trigger on workspace creation (12 credits) and backfilled for existing
workspaces. **No RLS write policy** — members read only.

### `credit_ledger` (append-only)

Every balance change: `entry_type` (`allowance` / `reservation` /
`refund` / `adjustment`), signed `amount`, `balance_after`,
`reference_generation`, `reason`. A unique index on
`(reference_generation, entry_type)` makes a second reservation or refund
for the same generation impossible — the ledger-level idempotency guard.
Members read only; no insert/update/delete policies.

### `usage_counters`

Per workspace per `YYYY-MM`: `images_generated`, `images_failed`,
`designs_created`. Members read only.

### Balance-integrity functions (security definer, service-role only)

- `apply_credit_change(workspace, type, amount, ref, reason, actor)` —
  the ONLY writer of balances: locks the wallet row, rejects overspend
  (`INSUFFICIENT_CREDITS`), writes the ledger entry and the new balance in
  one transaction.
- `ensure_wallet_period(workspace)` — monthly reset: if the period is
  stale, resets the balance to `monthly_allowance` via one `allowance`
  entry (image credits do not roll over).
- `increment_usage(workspace, period, field)` — whitelisted counter bump.

All three have `EXECUTE` revoked from `public`/`anon`/`authenticated` and
granted only to `service_role`, so end users can never mint credits by
calling the RPC directly.

## Phase 09 schema

### `plans`

Public catalog (readable by all authenticated; admin-managed): `key`,
`name`, `price_month_cents`/`price_year_cents`, `currency`,
`monthly_designs`, `monthly_image_credits`, `member_limit`,
`paddle_price_id_month`/`_year` (set per environment). Seeded: Starter
($19/mo, 12 credits), Growth ($49/mo, 36), Pro ($89/mo, 85).

### `billing_customers`

One Paddle customer per workspace (`paddle_customer_id`, `email`). Members
read; server-side writes only.

### `subscriptions`

One per workspace: `plan_id`, `paddle_subscription_id`, `status`
(`subscription_status` enum: trialing/active/past_due/paused/canceled/
expired), `billing_period`, `current_period_end` (renewal date),
`cancel_at_period_end`. **No user write policy** — a browser redirect can
never activate a subscription; only the webhook handler (service role)
writes it. Members read.

### `webhook_events`

Raw Paddle events: `paddle_event_id` (unique → idempotency),
`event_type`, `raw`, `status` (received/processed/failed), `error`,
`processed_at`. **No RLS policies at all** — service-role only.

### `apply_plan_allowance(workspace, allowance)`

Security-definer, service-role only: sets the wallet's `monthly_allowance`
from the plan and tops the balance up to it (never removes bought
credits). Called by the webhook handler on activation/plan change — the
Phase 08 ↔ Phase 09 bridge.

## Phase 10 schema

### `support_requests`

In-product support: `workspace_id`, optional `design_id`, `user_id`,
`kind` (problem/feedback/help), `message`, `context` jsonb (path, design
name/id captured at submission), `status`. RLS: any member creates their
own; the creator + workspace owner/admin + platform admin read.

### `design_ratings`

Satisfaction rating (1–5) per user per design (`unique(design_id,
user_id)`, upsert), optional comment. RLS: members read their workspace's;
a member creates/updates their own.

### `product_events`

Funnel/product analytics: `workspace_id?`, `user_id?`, `event_type`,
`props` jsonb. Written server-side by the analytics transport (service
role, fire-and-forget); **platform-admin read only** — no user insert
policy. Powers activation-funnel and KPI views (Phase 11).

## Tests

`supabase/tests/phase01_rls_tests.sql` — workspace isolation,
member/profile visibility, forged inserts, self-granted platform admin,
anonymous access. `supabase/tests/phase02_rls_tests.sql` — brand kit /
industry settings read vs. write role gates, plus documented storage
policy checks. `supabase/tests/phase03_rls_tests.sql` — catalog readability,
published-only visibility for normal users, admin capabilities, and version
immutability. `supabase/tests/phase04_rls_tests.sql` — design isolation,
viewer read-only enforcement, editor write rights, asset isolation, and
documented storage checks. `supabase/tests/phase05_rls_tests.sql` —
design-version immutability (no update/delete even for owners), export
inserts, soft delete, and outsider/viewer isolation.
`supabase/tests/phase06_rls_tests.sql` — prompt invisibility to user
sessions, generation log isolation and append-only behavior, prompt
version immutability. `supabase/tests/phase07_rls_tests.sql` —
reservation creation, idempotency-key uniqueness, confirm-own-pending,
immutability of completed rows, and outsiders unable to finish someone
else's reservation. Run in the Supabase SQL editor; all files roll back
their fixtures.

## Future tables (do NOT create early)

Phase 11: admin_audit_logs.
