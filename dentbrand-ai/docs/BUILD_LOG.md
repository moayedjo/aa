# DentBrand AI — Build Log

Append one entry per phase. Format: Date · Phase · Status · Completed
work · Changed files · Dependencies added · Database migrations · Tests
run · Test results · Manual testing steps · Known issues · Deferred
items · Recommended next command.

---

## 2026-07-28 — PHASE 00 + PHASE 01

**Phase**: 00 (Bootstrap, as prerequisite) + 01 (Auth, Workspaces and
Security)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Phase 00: Next.js 16 App Router scaffold (TypeScript strict, Tailwind
  v4, ESLint), vendored shadcn-style UI components, `.env.example`,
  landing placeholder page, `/api/health` route, lint/typecheck/build
  scripts, full `docs/` set.
- Phase 01: Supabase browser/server/proxy/admin clients; signup, login,
  logout, forgot/reset password, auth callback; profiles + user_roles
  provisioning trigger; workspaces + workspace_members with owner trigger;
  protected routes via Next 16 proxy plus server-side checks; full RLS
  with security-definer helpers; workspace isolation (foreign workspace →
  404); documented RLS test suite; security documentation.

**Changed files** (all under `dentbrand-ai/`)

- `src/proxy.ts`, `src/app/…` (landing, (auth)/ pages, auth/callback,
  dashboard/, dashboard/workspaces/[id], api/health), `src/components/…`
  (ui/, auth/, workspaces/), `src/lib/…` (supabase/, auth/, workspaces/,
  validation/, utils.ts), `src/types/database.ts`,
  `supabase/migrations/20260728000001_phase01_auth_workspaces.sql`,
  `supabase/tests/phase01_rls_tests.sql`, `.env.example`, `docs/*`.

**Dependencies added**

next 16, react 19, tailwindcss 4, @supabase/supabase-js, @supabase/ssr,
react-hook-form, zod, @hookform/resolvers, class-variance-authority,
clsx, tailwind-merge, lucide-react, server-only.

**Database migrations**

`20260728000001_phase01_auth_workspaces.sql` (enums, 4 tables, 4 helper
functions, 3 triggers, RLS policies). Not yet applied to a live project —
apply via Supabase SQL editor or CLI before manual testing.

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success; all routes + proxy compiled ✅
- RLS SQL tests: written and documented; require a live Supabase project
  (none configured in this environment) — run per TESTING.md before
  approving.

**Manual testing steps**: see `docs/TESTING.md` § Phase 01 (10 steps).

**Known issues**

- Live Supabase verification (signup email flow, RLS test run) is pending
  a real project + credentials; all server code paths compile and follow
  the documented Supabase SSR patterns.
- UI is LTR/English; RTL/Arabic UI work is scheduled for Phase 02+ per the
  phase definitions (fonts stack already includes an Arabic fallback).

**Deferred items**

- Brand Kit, onboarding, templates, editor, AI, credits, billing — later
  phases by design.
- Member invitation UI (schema + policies support it; UI arrives with
  onboarding/workspace management in a later phase).

**Recommended next command**

```
APPROVE PHASE 01 AND CONTINUE TO PHASE 02
```

---

## 2026-07-28 — PHASE 02

**Phase**: 02 (Activation Onboarding and Brand Kit)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Onboarding wizard at `/onboarding/[workspaceId]` with seven steps:
  identity (business name + logo upload), colors, fonts, contact,
  language & industry, services, review & finish.
- `brand_kits` and `workspace_industry_settings` tables with owner/admin
  write RLS; private `brand-assets` storage bucket (2 MB, images only)
  with workspace-scoped path policies; logos served via signed URLs.
- Live preview panel (RTL + Arabic sample content when Arabic is chosen),
  brand completion score (`lib/brand-kit/score.ts`), save-progress resume
  (`onboarding_step`), Brand Kit summary card on the workspace page,
  post-create redirect into onboarding.
- Analytics events (`onboarding_started/step_completed/logo_uploaded/
  completed`) via a structured-log transport (D-006).
- Industry/services from typed config as Phase 03 seed precursor (D-005).

**Changed files**

- New: `supabase/migrations/20260728000002_phase02_brand_kit.sql`,
  `supabase/tests/phase02_rls_tests.sql`, `src/lib/industries/config.ts`,
  `src/lib/validation/brand-kit.ts`, `src/lib/brand-kit/*`
  (actions, queries, score, upload), `src/lib/analytics/track.ts`,
  `src/app/onboarding/[workspaceId]/page.tsx`,
  `src/components/onboarding/*` (wizard, live-preview, 7 steps).
- Modified: `src/types/database.ts`, `src/lib/supabase/proxy.ts`
  (protect `/onboarding`), `src/lib/workspaces/actions.ts` (redirect to
  onboarding), `src/app/dashboard/workspaces/[id]/page.tsx` (Brand Kit
  card), docs.

**Dependencies added**: none.

**Database migrations**: `20260728000002_phase02_brand_kit.sql` (2 tables,
RLS, storage bucket + 4 storage policies). Apply after 0001.

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success; `/onboarding/[workspaceId]` compiled ✅
- RLS SQL tests for Phase 02 written; require a live Supabase project.

**Manual testing steps**: `docs/TESTING.md` § Phase 02 (12 steps).

**Known issues**

- Fonts are stored by name; actual font loading in previews/exports is
  Phase 03/05 scope, so the live preview uses system fallbacks.
- Wizard chrome is English (LTR); the *content* language + RTL preview are
  implemented. Full Arabic UI localization is tracked for a later phase.

**Deferred items**

- Templates, editor, AI, credits, billing (later phases).
- Member invitations UI; promoting industry config to DB (Phase 03).

**Recommended next command**

```
APPROVE PHASE 02 AND CONTINUE TO PHASE 03
```

---

## 2026-07-28 — PHASE 03

**Phase**: 03 (Vertical Content and Templates)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Database-backed vertical structure: industry_verticals, services,
  content_goals, template_categories (dental catalog seeded in migration
  0003 with keys matching the Phase 02 config).
- Template system: templates (status lifecycle draft → testing → approved
  → published → archived), immutable template_versions (no update/delete
  policies, even for admins), template_services links.
- Template JSON Schema (Zod, schemaVersion 1): canvas, six layer types,
  editable/locked flags, zIndex, maxCharacters limits, per-language static
  text, fixed `{{variable}}` set; validated before every save and render.
- Resolver (`resolveTemplate`) substituting brand + sample content per
  language (RTL/LTR + start/end alignment resolution).
- Five production dental templates in `supabase/seed.sql` (Service
  Spotlight, Special Offer, Dental Tip, Booking Reminder, Seasonal
  Greeting) — all validated against the schema in CI-style script run.
- User template gallery (`/dashboard/workspaces/[id]/templates`) with
  brand-applied previews and EN/AR toggle.
- Admin section (`/admin/templates`) gated by platform_admin: list,
  create (starter JSON), edit metadata/services, JSON editing that creates
  new immutable versions, status transitions with publish-time
  re-validation, live sample-brand preview (EN/AR), version history.
- Onboarding switched to the DB catalog (industry + services steps and
  server-side validation) — completes D-005.

**Changed files**

- New: migration 0003, `supabase/seed.sql`,
  `supabase/tests/phase03_rls_tests.sql`, `src/lib/templates/*` (schema,
  resolve, queries, admin-actions), `src/lib/industries/queries.ts`,
  `src/lib/auth/queries.ts`, `src/components/templates/*` (preview,
  font-links), `src/components/admin/*` (new-template-form,
  template-editor), `/admin` layout + template pages, workspace templates
  page.
- Modified: types, onboarding page/wizard/steps (DB catalog),
  brand-kit actions (DB validation), validation schema, industries config
  (now seed reference), workspace page (templates card), docs.

**Dependencies added**: none.

**Database migrations**: `20260728000003_phase03_verticals_templates.sql`
(1 enum, 7 tables, RLS, dental catalog seed). Then run `supabase/seed.sql`
for the five templates.

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success; gallery + 3 admin routes compiled ✅
- Seed validation script: all 5 template JSONs pass the Zod schema ✅
- Phase 03 RLS SQL tests written; require a live Supabase project.

**Manual testing steps**: `docs/TESTING.md` § Phase 03 (8 steps) +
Template Quality Checklist.

**Known issues**

- Preview fidelity: HTML/CSS renderer approximates the future Konva canvas
  (D-007); text wrapping may differ slightly.
- Preview fonts load from Google Fonts at runtime in the browser;
  export-grade font embedding/validation is Phase 05.
- Template Quality Checklist items relating to export (real-size PNG,
  Arabic font export) can only be fully verified from Phase 05.

**Deferred items**

- Create-design-from-template flow and the Konva editor (Phase 04).
- Content-goal-based template recommendation (Phase 10 uses content_goals
  seeded now).

**Recommended next command**

```
APPROVE PHASE 03 AND CONTINUE TO PHASE 04
```

---

## 2026-07-28 — PHASE 04

**Phase**: 04 (First Design Flow and Editor Foundation)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Guided create flow (`/dashboard/workspaces/[id]/create`): service →
  content goal → brand-previewed template picker (EN/AR) → named design.
- `createDesign` pins template_id + template_version, applies the Brand
  Kit automatically (colors, fonts, business info, logo as internal
  storage ref), fills sample content, flattens groups, validates and
  stores the design, then opens the editor.
- design_projects + design_assets tables with viewer-read-only RLS;
  private design-assets bucket (5 MB, images) with editor-write policies.
- Design JSON schema (Zod): fully resolved values; image sources
  restricted to internal `supabase://` refs — external URLs impossible.
- React Konva editor (`/editor/[designId]`): responsive Stage at real
  export dimensions (visual scale only), text/image/shape/logo/icon
  rendering, RTL text via Konva `direction`, cover/contain image
  fitting, layer selection (canvas + layers panel), drag-to-move for
  editable layers, locked layers immovable with lock notice, properties
  panel (text with maxCharacters counter, font size, alignment, brand
  color swatches + custom picker, image replace via upload, fit toggle,
  X/Y), Zustand store with a single guarded update path.
- Manual save with saved/unsaved/saving/error status, retry, and
  beforeunload warning (D-010). Web font loading re-render for canvas.
- Workspace page now lists designs with editor links + Create button;
  `/editor` and `/admin` added to protected route prefixes.

**Changed files**

- New: migration 0004, `supabase/tests/phase04_rls_tests.sql`,
  `src/lib/designs/*` (schema, create, queries, actions, upload),
  `src/stores/editor-store.ts`, create page,
  `src/components/create-flow/create-flow.tsx`, editor page,
  `src/components/editor/*` (shell, canvas, layers-panel,
  properties-panel).
- Modified: templates queries (services map), workspace page (designs
  card), templates gallery footer, proxy, docs.

**Dependencies added**: konva, react-konva, zustand (approved stack).

**Database migrations**: `20260728000004_phase04_design_projects.sql`
(2 tables, RLS, design-assets bucket + 3 storage policies).

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success; create + editor routes compiled ✅
- Phase 04 RLS SQL tests written; require a live Supabase project.

**Manual testing steps**: `docs/TESTING.md` § Phase 04 (10 steps).

**Known issues**

- Undo/redo, autosave, versions, recovery, export: Phase 05 by design.
- Image crop/zoom UI: Phase 05/07 scope (cover/contain fitting exists).
- Konva RTL relies on canvas bidi text support — verify on target
  browsers during Phase 05 QA alongside export checks.

**Deferred items**

- Autosave + recovery + versions + undo/redo + trash + My Designs + PNG
  export (Phase 05); AI copy (Phase 06); icon set rendering (icon layers
  currently render as colored placeholders — no seeded template uses one).

**Recommended next command**

```
APPROVE PHASE 04 AND CONTINUE TO PHASE 05
```

---

## 2026-07-28 — PHASE 05

**Phase**: 05 (Autosave, Recovery and Export)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Autosave: 2s-debounced saves on every change; a design is only marked
  saved after server confirmation; failed saves show a persistent red
  status and auto-retry every 5s.
- Local recovery: throttled draft in localStorage per design, cleared on
  every confirmed save, offered via banner on reopen only when newer than
  the server state (schema-validated before applying).
- Version history: immutable design_versions (checkpoint every 10
  autosaves, manual "Save version", automatic pre-restore snapshot);
  restore never destroys work; history panel in the editor.
- Undo/redo with coalescing (800ms window per layer), 50-step cap,
  Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y shortcuts + header buttons.
- Duplicate design; soft delete (Trash) with restore; permanent delete
  for owner/admin only (with confirmation, requires prior trash).
- My Designs page (`…/designs`) with trash view; editor redirects away
  from trashed designs; workspace page links.
- PNG export from the Konva stage at real canvas dimensions
  (pixelRatio compensates the visual scale), with pre-export validation:
  fonts loaded (document.fonts.check per text layer), image/logo assets
  present AND loaded — problems block export with a clear message; output
  dimensions verified against the canvas; every attempt (success or
  failure + reason) recorded in design_exports.

**Changed files**

- New: migration 0005, `supabase/tests/phase05_rls_tests.sql`,
  `src/lib/designs/export.ts`, `src/components/editor/stage-ref.ts`,
  `src/components/editor/history-panel.tsx`,
  `src/components/designs/design-actions.tsx`, My Designs page.
- Modified: designs queries (+versions/trash), designs actions
  (+7 actions), editor store (history/assets/recovery support), editor
  canvas (stage ref, asset load reporting), editor shell (autosave,
  recovery banner, undo/redo, export), editor page, workspace page, docs.

**Dependencies added**: none.

**Database migrations**: `20260728000005_phase05_versions_exports.sql`
(design_versions, design_exports, deleted_at + RLS; versions immutable).

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success; designs route compiled ✅
- Phase 05 RLS SQL tests written; require a live Supabase project.

**Manual testing steps**: `docs/TESTING.md` § Phase 05 (11 steps).

**Known issues**

- Undo history is client-session only (clears on reload) — persisted
  history lives in design_versions.
- Font validation depends on document.fonts.check; system-fallback
  rendering differences are covered by the quality checklist during QA.
- Arabic filename slugs in export keep Arabic characters; some OSes may
  transliterate on save.

**Deferred items**

- AI copy (Phase 06); AI images + crop/position UI (Phase 07);
  usage counters for exports (Phase 08 reads design_exports).

**Recommended next command**

```
APPROVE PHASE 05 AND CONTINUE TO PHASE 06
```

---

## 2026-07-28 — PHASE 06

**Phase**: 06 (AI Copy)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Gemini server integration: direct REST (`generateContent`) with JSON
  response mode, 30s timeout, one retry on invalid output, normalized
  errors, server-only API key (D-013).
- Structured output Zod-validated (`aiCopySchema`): 3 headline options,
  body, caption, 3 CTA options, hashtags, English image prompt,
  medicalDisclaimerNeeded.
- Database-backed, versioned, vertical-scoped prompts (dental seed:
  `social-copy` + `social-copy-field` v1) embedding the content rules
  (no diagnosis/guarantees/fabricated prices/discounts/reviews/
  superlatives; supplied info only; char limits; caption ≠ design text).
  Prompts hidden from user sessions; read via service role (D-014).
- ai_generations append-only log (prompt version, model, duration,
  sanitized input, validated output, status/error).
- Editor AI panel: service/goal/tone/offer/instructions form; results
  with per-option Apply into editable layers (clipped to maxCharacters);
  partial regeneration per field (more options, shorten, rewrite,
  professional, friendly); previous results dropdown backed by both
  client history and ai_generations; caption+hashtags copy-to-clipboard;
  disclaimer hint; image prompt surfaced for Phase 07.
- Character limits travel from the design's own layers into the prompt
  and are re-enforced on apply. AI failures never touch design_json.
- Analytics events: ai_copy_generated / ai_copy_field_regenerated /
  ai_copy_failed.

**Changed files**

- New: migration 0006, `supabase/tests/phase06_rls_tests.sql`,
  `src/lib/ai/*` (gemini, copy-schema, actions, queries),
  `src/components/editor/copy-panel.tsx`.
- Modified: editor page + shell (panel wiring), analytics event union,
  `.env.example` (GEMINI_API_KEY/GEMINI_MODEL), docs.

**Dependencies added**: none (REST via fetch — D-013).

**Database migrations**: `20260728000006_phase06_ai_copy.sql`
(prompt_templates, prompt_versions, ai_generations + dental prompt seed).

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success ✅
- Phase 06 RLS SQL tests written; require a live Supabase project.
- Live Gemini calls require a real GEMINI_API_KEY — verify via manual
  steps.

**Manual testing steps**: `docs/TESTING.md` § Phase 06 (10 steps).

**Known issues**

- Character limits are instructed to the model and enforced on apply;
  the model may still occasionally overshoot in the displayed options
  (apply clips them).
- Field regeneration logs partial outputs; only full packs appear in the
  reload-persistent "previous results" list (by design).
- Generation requires SUPABASE_SERVICE_ROLE_KEY at runtime for prompt
  reads (D-014).

**Deferred items**

- AI images, credit reservation/refund/idempotency (Phase 07 — the
  imagePrompt field is already produced); prompt admin UI (Phase 11);
  per-generation credit costs (Phase 08).

**Recommended next command**

```
APPROVE PHASE 06 AND CONTINUE TO PHASE 07
```

---

## 2026-07-28 — PHASE 07

**Phase**: 07 (AI Images and Credit Safety)

**Status**: COMPLETE — awaiting approval

**Completed work**

- Gemini-compatible image generation (server-only, 60s timeout,
  normalized errors) returning inline image bytes.
- Image Prompt Builder: user/AI scene + server-appended composition and
  safety rules — no text, no logos, no watermark, no graphic procedures,
  no fake before/after, negative space for the overlay (D-016).
- Full credit-safe lifecycle: validate → balance check → reserve
  (pending `ai_generations` row) → generate → **store in Supabase Storage**
  → confirm. Any failure marks the reservation failed and refunds it; a
  failed generation never consumes a final credit (D-015).
- Idempotency: one key per submission, unique partial index; duplicates
  return the original result instead of charging twice, and concurrent
  duplicates lose the unique-violation race safely.
- Generated images are registered as `design_assets` (kind `generated`)
  and enter the canvas only as internal `supabase://` refs.
- Editor image panel: slot picker, prompt (pre-filled from the latest AI
  copy `imagePrompt`), cost disclosure before generating, in-flight
  status, history grid of previous images with "Use" (keep previous
  image), apply → autosave.
- Analytics: ai_image_generated / ai_image_failed.

**Changed files**

- New: migration 0007, `supabase/tests/phase07_rls_tests.sql`,
  `src/lib/ai/image-prompt.ts`, `src/lib/ai/image-actions.ts`,
  `src/lib/credits/reservation.ts`,
  `src/components/editor/image-panel.tsx`.
- Modified: `src/lib/ai/gemini.ts` (image model + generateImage),
  `src/lib/ai/queries.ts` (image history), editor page + shell,
  analytics event union, `.env.example`, docs.

**Dependencies added**: none.

**Database migrations**: `20260728000007_phase07_ai_images.sql` — extends
ai_generations (image kind, pending status, idempotency_key, asset_path),
design_assets `generated` kind, and the finish-own-pending RLS policy.

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success ✅
- Phase 07 RLS SQL tests written; require a live Supabase project.
- Live image generation requires a real GEMINI_API_KEY — manual steps.

**Manual testing steps**: `docs/TESTING.md` § Phase 07 (10 steps).

**Known issues**

- Credit balances are not enforced yet: `checkImageCredit` grants every
  request until Phase 08 implements wallets/ledger behind the same
  abstraction (D-015). The reservation/refund/idempotency ordering is
  complete and testable now.
- Crop/position of generated images uses the Phase 04 cover/contain
  fitting; a dedicated crop UI is still open.
- Image model availability varies by API key; `GEMINI_IMAGE_MODEL`
  overrides the default.

**Deferred items**

- Credit wallet, append-only ledger, usage counters, low-balance
  warnings, rate limits (Phase 08).
- Alternatives-per-generation (multiple images per request) — deferred as
  "where economically reasonable"; history already keeps every result.

**Recommended next command**

```
APPROVE PHASE 07 AND CONTINUE TO PHASE 08
```

---

## 2026-07-28 — PHASE 08

**Phase**: 08 (Credits and Usage Transparency)

**Status**: COMPLETE — awaiting approval

**Completed work**

- credit_wallets, append-only credit_ledger, usage_counters. Balances
  change only via the security-definer `apply_credit_change` (locks wallet,
  rejects overspend, writes ledger + balance in one txn); EXECUTE revoked
  from end users and granted only to service_role (D-017).
- Monthly reset (`ensure_wallet_period`) — resets to the monthly allowance
  with one allowance ledger entry; wallets provisioned by trigger (12
  credits) and backfilled for existing workspaces.
- Real reservation lifecycle wired into Phase 07's abstraction: reserve
  after the idempotency-guarded pending row (D-018), refund on failure
  (nets zero), confirm bumps the usage counter. Ledger-level unique
  `(reference_generation, entry_type)` blocks double reserve/refund.
- Usage page (`/dashboard/workspaces/[id]/usage`): balance, monthly
  allowance, images this/failed, allowance period, full ledger activity
  with running balance, refund count, low-credit banner, "how credits
  work" explainer.
- Real cost disclosure in the editor image panel ("Uses 1 image credit ·
  N left"), Generate disabled + banner at zero, local decrement on
  success; Usage card + credit summary on the workspace page.
- Rate limiting (per-workspace rolling window) on image generation;
  designs_created usage counter recorded on design creation.

**Changed files**

- New: migration 0008, `supabase/tests/phase08_rls_tests.sql`,
  `src/lib/credits/queries.ts`, `src/lib/credits/rate-limit.ts`,
  `src/lib/credits/usage.ts`, usage page.
- Modified: `src/lib/credits/reservation.ts` (real implementation),
  `src/lib/ai/image-actions.ts` (rate limit + reserve), image panel +
  editor shell + editor page (balance), workspace page (usage card),
  `src/lib/designs/actions.ts` (designs_created), docs.

**Dependencies added**: none.

**Database migrations**: `20260728000008_phase08_credits.sql` — 3 tables,
3 security-definer functions (apply_credit_change, ensure_wallet_period,
increment_usage) with EXECUTE locked to service_role, wallet trigger +
backfill, RLS (read-only for members).

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success ✅
- Phase 08 RLS SQL tests written; require a live Supabase project.

**Manual testing steps**: `docs/TESTING.md` § Phase 08 (10 steps).

**Known issues**

- Monthly allowance defaults to 12 for every workspace; per-plan
  allowances arrive with Paddle plans in Phase 09 (the wallet already has
  `monthly_allowance` for the plan to set).
- Reset is lazy (on wallet read via `ensure_wallet_period`), so a workspace
  that is never opened in a new month resets on its next access — correct
  for spendable balances, no cron needed.
- Rate limit fails open on a counting error (the hard credit limit still
  applies).

**Deferred items**

- Plans, subscriptions, Paddle checkout/webhooks, per-plan allowances
  (Phase 09); admin credit adjustments with audit (Phase 11 — the
  `adjustment` ledger type already exists).

**Recommended next command**

```
APPROVE PHASE 08 AND CONTINUE TO PHASE 09
```

---

## 2026-07-30 — PHASE 09

**Phase**: 09 (Transparent Billing)

**Status**: COMPLETE — awaiting approval

**Completed work**

- plans (seeded Starter/Growth/Pro), billing_customers, subscriptions,
  webhook_events. Subscriptions have no user write path — webhooks are the
  source of truth (D-019).
- Paddle webhook route: reads the raw body, verifies the HMAC
  `Paddle-Signature` (constant-time, skew window), records every event by
  unique `event_id` (idempotent), processes once, mirrors subscription
  state, and returns 500 for transient failures so Paddle retries.
- Webhook handler applies the plan's monthly allowance to the wallet on
  activation/plan change via the service-role `apply_plan_allowance`
  (Phase 08 bridge — tops up, never removes bought credits).
- Server-side Paddle client (REST) + on-demand Paddle.js overlay (D-020):
  createTransaction, cancel, reactivate, change price; graceful
  "not configured" behavior.
- Billing actions (owner/admin): createCheckout, cancelSubscription,
  reactivateSubscription, changePlan — they drive Paddle but never flip
  our status directly.
- Billing page: plan picker (annual NOT default-selected), current
  subscription with renewal date, in-app cancel with confirm + reactivate,
  upgrade/downgrade, past-due banner, refund/cancellation policy. Billing
  card + link on the workspace page.

**Changed files**

- New: migration 0009, `supabase/tests/phase09_rls_tests.sql`,
  `src/lib/billing/*` (paddle, webhook, queries, types, actions,
  checkout-client), `src/app/api/webhooks/paddle/route.ts`,
  `src/components/billing/*` (plan-picker, manage-subscription), billing
  page.
- Modified: analytics event union, workspace page (billing card),
  `.env.example`, docs.

**Dependencies added**: none.

**Database migrations**: `20260728000009_phase09_billing.sql` — 4 tables,
subscription_status enum, `apply_plan_allowance` (service-role only), RLS
(public plans, member-read billing, webhook_events service-role only),
plan seed.

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success; `/api/webhooks/paddle` + billing page
  compiled ✅
- Phase 09 RLS SQL tests written; require a live Supabase project.
- Live checkout requires a Paddle sandbox account — manual steps.

**Manual testing steps**: `docs/TESTING.md` § Phase 09 (11 steps).

**Known issues**

- Paddle price ids must be set on the `plans` rows for real checkout;
  without them (and the API/webhook secrets) the UI shows clear
  "not configured" states rather than failing.
- Renewal-reminder emails (annual) are noted in the policy copy; the
  actual Resend email send is wired with the rest of transactional email
  and is a small follow-up (event + template already flow through the
  webhook).
- Billing history line items (individual invoices) are surfaced via
  Paddle's customer portal; the in-app page shows plan, status, renewal,
  and the ledger already covers credit-side history.

**Deferred items**

- Guided experience, support requests, feedback, design ratings
  (Phase 10); admin billing/plan management UI (Phase 11 — plans are
  admin-writable by RLS already).

**Recommended next command**

```
APPROVE PHASE 09 AND CONTINUE TO PHASE 10
```

---

## 2026-07-30 — PHASE 10

**Phase**: 10 (Guided Experience and Support)

**Status**: COMPLETE — awaiting approval

**Completed work**

- support_requests, design_ratings, product_events with RLS.
- In-editor support: a non-blocking floating Help widget
  (report a problem / get help / feedback) that attaches design +
  workspace context to the request without navigating away.
- Design satisfaction rating (1–5) inline in the editor, upsert per user,
  persists across reloads — never blocks work.
- Regeneration-reason capture action recording an `ai_regenerated`
  product event.
- Funnel measurement: `trackEvent` now persists every event to
  product_events (fire-and-forget, D-021); added design_created,
  design_exported, design_rated, support_request_created, ai_regenerated
  events.
- Guided experience: First Design Checklist card (brand → design →
  export, self-hiding when complete) on the workspace page; recommended
  templates via the create flow's service-first ordering; helpful empty
  states retained.

**Changed files**

- New: migration 0010, `supabase/tests/phase10_rls_tests.sql`,
  `src/lib/support/{actions,queries}.ts`,
  `src/components/support/{support-widget,design-rating,first-design-checklist}.tsx`.
- Modified: `src/lib/analytics/track.ts` (product_events transport + new
  events), editor page + shell (support widget + rating), workspace page
  (checklist), `src/lib/designs/actions.ts` (funnel events), docs.

**Dependencies added**: none.

**Database migrations**: `20260728000010_phase10_support.sql` — 3 tables,
RLS (member support/ratings, platform-admin-only product_events).

**Tests run / results**

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run typecheck` → pass ✅
- `npm run build` → success ✅
- Phase 10 RLS SQL tests written; require a live Supabase project.

**Manual testing steps**: `docs/TESTING.md` § Phase 10 (9 steps).

**Known issues**

- Product-event persistence is fire-and-forget (D-021); a small fraction
  may be lost in serverless, with the structured log as fallback.
- Support-request triage/closing is surfaced to admins in Phase 11; Phase
  10 covers creation + context capture and owner/admin read.

**Deferred items**

- Admin support-ticket management, product KPI dashboards, PostHog/Sentry
  wiring, admin_audit_logs (Phase 11).

**Recommended next command**

```
APPROVE PHASE 10 AND CONTINUE TO PHASE 11
```
