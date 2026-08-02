# DentBrand AI — Decisions

Format per entry: Decision · Context · Options considered · Selected
option · Reason · Consequences · Date.

---

## D-001 — Vendor shadcn/ui components manually

- **Decision**: Copy shadcn-style components into `src/components/ui/` by
  hand instead of using the shadcn CLI.
- **Context**: The build environment's egress proxy cannot reach
  `ui.shadcn.com`, so `shadcn init/add` fails.
- **Options considered**: (1) shadcn CLI, (2) manual vendoring of the same
  component source, (3) a different component library.
- **Selected option**: (2) manual vendoring.
- **Reason**: shadcn/ui is by design copied-in source; vendoring manually
  produces the identical outcome without changing the approved stack.
- **Consequences**: New components are added by hand (or by CLI in an
  environment with registry access). Current components avoid Radix
  primitives (`Button` has no `asChild`; `Label` is a plain `<label>`);
  Radix deps can be added later if a component needs them.
- **Date**: 2026-07-28

## D-002 — System font stack instead of next/font Google fonts

- **Decision**: Remove the scaffolded Geist `next/font/google` imports and
  use a system font stack (including "Noto Sans Arabic" fallback).
- **Context**: `next/font/google` downloads fonts at build time; the build
  environment's network makes this flaky, and Arabic font strategy is a
  Phase 03/05 concern (approved fonts, export validation).
- **Options considered**: (1) keep Geist, (2) system stack now + proper
  self-hosted fonts in the template/editor phases.
- **Selected option**: (2).
- **Reason**: Build reliability now; the real font decision (approved
  brand fonts, Arabic rendering, export parity) belongs to later phases.
- **Consequences**: UI uses platform fonts until the font system lands.
- **Date**: 2026-07-28

## D-003 — Next.js 16 proxy convention

- **Decision**: Use `src/proxy.ts` (exported `proxy` function) rather than
  `middleware.ts`.
- **Context**: create-next-app installed Next.js 16, which renames
  Middleware to Proxy; `middleware.ts` is deprecated.
- **Options considered**: (1) pin Next 15 to keep `middleware.ts`,
  (2) adopt the Next 16 convention.
- **Selected option**: (2).
- **Reason**: Staying current with the installed major; functionality is
  identical.
- **Consequences**: Docs/examples that mention "middleware" map to
  `src/proxy.ts` here.
- **Date**: 2026-07-28

## D-004 — Workspace owner assigned by database trigger

- **Decision**: A trigger on `workspaces` insert adds the creator as an
  `owner` member, instead of a second client-side insert.
- **Context**: Membership must exist atomically with the workspace or the
  creator can't see their own workspace (RLS) after a partial failure.
- **Options considered**: (1) two inserts from the server action, (2) an
  RPC doing both, (3) `security definer` trigger.
- **Selected option**: (3).
- **Reason**: Atomic, cannot be forgotten by future code paths, keeps the
  insert policy on `workspace_members` strict (owner/admin only).
- **Consequences**: The trigger is part of the security surface and is
  documented in SECURITY.md.
- **Date**: 2026-07-28

## D-005 — Interim typed config for industry services (Phase 02)

- **Decision**: Onboarding's industry/service selection reads from a typed
  config (`src/lib/industries/config.ts`); selections are stored as stable
  string keys in `workspace_industry_settings.selected_services`.
- **Context**: Phase 02 requires industry and service selection, but the
  database-backed `industry_verticals` / `services` tables are explicitly
  Phase 03 — creating them early violates the phase gate.
- **Options considered**: (1) create the Phase 03 tables early, (2) typed
  config now, promoted to DB seed data in Phase 03, (3) free-text services.
- **Selected option**: (2).
- **Reason**: Respects the phase plan; keys stay stable so Phase 03 can
  migrate without touching stored workspace selections.
- **Consequences**: Phase 03 must seed the DB from this config and switch
  reads to the database.
- **Date**: 2026-07-28

## D-006 — Analytics via structured log transport until Phase 11

- **Decision**: `src/lib/analytics/track.ts` emits structured server-side
  JSON logs for onboarding events; no PostHog dependency yet.
- **Context**: Phase 02 requires onboarding analytics events, but the full
  PostHog/Sentry setup is Phase 11 scope and its dependency would be
  installed early.
- **Options considered**: (1) install PostHog now, (2) no analytics,
  (3) an internal `trackEvent` abstraction with a log transport.
- **Selected option**: (3).
- **Reason**: Events exist and are queryable in server logs from day one;
  Phase 11 swaps the transport without touching call sites.
- **Consequences**: No dashboards until Phase 11.
- **Date**: 2026-07-28

## D-007 — HTML/CSS preview renderer before the Konva editor

- **Decision**: Phase 03's brand preview renders template JSON as
  absolutely-positioned HTML/CSS scaled with a CSS transform
  (`TemplatePreview`), not React Konva.
- **Context**: Phase 03 requires brand-applied template previews and
  Arabic/English testing, but the editor (React Konva) is explicitly
  Phase 04 scope.
- **Options considered**: (1) pull Konva forward into Phase 03,
  (2) static thumbnail images, (3) HTML/CSS renderer over the same
  resolved-template data.
- **Selected option**: (3).
- **Reason**: Faithful enough to judge branding/layout/RTL, zero new
  dependencies, and the resolver (`resolveTemplate`) is reused by the
  Phase 04 editor unchanged. Stored canvas dimensions are never altered —
  scaling is visual only, matching the editor rules.
- **Consequences**: Minor fidelity differences (text wrapping) versus the
  future canvas; previews load approved Google Fonts at runtime in the
  browser, while export-grade font embedding/validation remains Phase 05.
- **Date**: 2026-07-28

## D-008 — Template status transitions enforced in the action layer

- **Decision**: The template lifecycle (draft ↔ testing ↔ approved →
  published → archived → draft) is enforced in `updateTemplateStatus`;
  publishing re-validates the current version's JSON.
- **Context**: The spec requires draft/testing/approved/published/archived
  states and that only valid templates reach users.
- **Options considered**: (1) free status changes, (2) DB trigger,
  (3) action-layer transition table + Zod re-validation on publish.
- **Selected option**: (3).
- **Reason**: Keeps the rule next to the admin workflow with clear error
  messages; RLS already restricts who can change status at all.
- **Consequences**: Direct service-role writes bypass the transition
  table — acceptable, as service-role usage is audited (SECURITY.md).
- **Date**: 2026-07-28

## D-009 — Designs store internal asset refs, not URLs

- **Decision**: Design JSON persists image/logo sources as
  `supabase://bucket/path` references; signed URLs are minted server-side
  on every editor load and never stored.
- **Context**: Signed URLs expire, and the editor rules forbid loading
  uncontrolled external URLs into the canvas.
- **Options considered**: (1) store signed URLs, (2) make buckets public,
  (3) internal refs + per-load signed URL resolution.
- **Selected option**: (3).
- **Reason**: Designs stay valid forever, buckets stay private, and the
  Zod schema can reject any non-internal source outright.
- **Consequences**: Every editor load resolves refs to signed URLs
  (one storage call per unique asset); Phase 05 export reuses the same
  resolution path.
- **Date**: 2026-07-28

## D-010 — Manual save in Phase 04; autosave deferred to Phase 05

- **Decision**: The Phase 04 editor persists via an explicit Save button
  with a visible saved/unsaved/saving/error status and a beforeunload
  warning; autosave, local recovery, versions, undo/redo stay in Phase 05.
- **Context**: Phase 05 owns the reliability feature set; Phase 04 only
  needs the editor foundation, but losing work silently would violate the
  "failed save must be visible" principle.
- **Options considered**: (1) no persistence until Phase 05, (2) full
  autosave early, (3) manual save + status now.
- **Selected option**: (3).
- **Reason**: Keeps the phase gate honest while never marking a design
  saved without server confirmation.
- **Consequences**: Phase 05 replaces the manual flow with autosave built
  on the same `saveDesign` action.
- **Date**: 2026-07-28

## D-011 — Server-side version snapshots; client-side PNG export

- **Decision**: Version snapshots (`createDesignVersion`, and the
  pre-restore snapshot inside `restoreDesignVersion`) read the design's
  stored JSON server-side rather than trusting client payloads. PNG export
  renders client-side from the Konva stage with validation (fonts, assets,
  output dimensions) and is logged to `design_exports`.
- **Context**: Phase 05 requires versions/restore and validated export;
  the editor's canvas already exists in the browser, while history must be
  tamper-proof.
- **Options considered**: (1) client-sent version snapshots, (2) server-side
  headless rendering for export, (3) server-side snapshots + client-side
  validated export.
- **Selected option**: (3).
- **Reason**: History integrity needs the server; a headless render farm
  is heavy for MVP while the browser canvas is exactly what the user sees
  ("export matches editor" by construction), with dimension verification
  guarding the scale math.
- **Consequences**: Export requires the design open in the editor; server-
  side rendering can be revisited if bulk/off-screen export is ever needed.
- **Date**: 2026-07-28

## D-012 — Recovery drafts in localStorage keyed per design

- **Decision**: While editing, a throttled recovery draft is written to
  localStorage (`dentbrand-recovery-{designId}`); it is cleared on every
  confirmed save and offered on load only when newer than the server's
  `updated_at`.
- **Context**: Phase 05 requires a local recovery copy so a crash between
  edits and autosave loses nothing.
- **Options considered**: (1) IndexedDB, (2) localStorage, (3) none
  (rely on 2s autosave window).
- **Selected option**: (2).
- **Reason**: Design JSON is small (KBs); localStorage is synchronous,
  simple and sufficient. The draft is validated with the design schema
  before being applied.
- **Consequences**: Recovery is per-browser/per-device by nature; storage
  quota errors are swallowed (autosave remains the primary safety net).
- **Date**: 2026-07-28

## D-013 — Gemini via direct REST fetch, no SDK

- **Decision**: `src/lib/ai/gemini.ts` calls the Gemini
  `generateContent` REST endpoint with `fetch` (JSON response mime type,
  30s timeout, normalized errors) instead of adding the Google SDK.
- **Context**: Phase 06 needs server-side text generation; the code
  quality rules say avoid unnecessary dependencies.
- **Options considered**: (1) @google/genai SDK, (2) direct REST.
- **Selected option**: (2).
- **Reason**: One endpoint, one call shape; fetch keeps the dependency
  tree flat and the error surface fully under our control.
- **Consequences**: If later phases need streaming or multimodal
  features, revisiting the SDK is a contained change inside gemini.ts.
- **Date**: 2026-07-28

## D-014 — Prompts hidden from user sessions; read via service role

- **Decision**: RLS restricts prompt tables to platform admins; the
  generation server actions read the current prompt version with the
  audited service-role client.
- **Context**: Generation runs under the user's session, but prompts are
  platform IP that any authenticated user could otherwise harvest via
  the Supabase REST API.
- **Options considered**: (1) authenticated read policy on prompts,
  (2) hardcode prompts in source, (3) admin-only RLS + service-role read.
- **Selected option**: (3).
- **Reason**: Keeps prompts database-backed and versioned (spec
  requirement) without exposing them; service-role usage stays inside one
  audited server module path.
- **Consequences**: Generation requires SUPABASE_SERVICE_ROLE_KEY at
  runtime; documented in SECURITY.md.
- **Date**: 2026-07-28

## D-015 — The pending generation row is the credit reservation

- **Decision**: Phase 07 implements the full reservation lifecycle using a
  `pending` row in `ai_generations` (with `idempotency_key`), and puts the
  wallet/ledger writes behind `src/lib/credits/reservation.ts`, whose
  internals Phase 08 fills in.
- **Context**: Phase 07 must guarantee "a failed generation never consumes
  a final credit" and "a duplicate request does not charge twice", but
  `credit_wallets` / `credit_ledger` are explicitly Phase 08 tables.
- **Options considered**: (1) create the Phase 08 credit tables early,
  (2) skip credit safety until Phase 08, (3) reservation lifecycle now
  against a credits abstraction that Phase 08 implements.
- **Selected option**: (3).
- **Reason**: The safety-critical ordering (reserve → generate → store →
  confirm, refund on failure) and the idempotency guarantee are proven and
  testable now; Phase 08 adds balances and the append-only ledger without
  touching a single call site.
- **Consequences**: Until Phase 08, `checkImageCredit` grants every
  request and confirm/refund emit structured logs instead of ledger rows.
  Phase 08 must replace those three function bodies and enforce real
  balances.
- **Date**: 2026-07-28

## D-016 — Composition and safety rules appended server-side

- **Decision**: `buildImagePrompt` always appends the no-text/no-logo/
  no-watermark/no-graphic-procedure/negative-space rules to whatever scene
  the user or AI copy supplies.
- **Context**: The image rules are product requirements, not user
  preferences; a client-editable prompt could drop them.
- **Options considered**: (1) put the rules in the UI placeholder text,
  (2) store them in a prompt version row, (3) append them server-side in
  code on every request.
- **Selected option**: (3).
- **Reason**: They cannot be bypassed, and they apply to prompts coming
  from AI copy and from free-text alike. (Phase 11's prompt admin can
  later promote them to a versioned row if they need tuning without a
  deploy.)
- **Consequences**: Changing the rules needs a deploy until then.
- **Date**: 2026-07-28

## D-017 — Balance changes only through a security-definer function

- **Decision**: `credit_wallets`/`credit_ledger` have no write RLS
  policies; the only balance writer is `apply_credit_change`, a
  security-definer function with `EXECUTE` granted solely to
  `service_role`. Server actions call it via the audited admin client.
- **Context**: The core credit invariant is "no balance change without a
  ledger entry", and users must not be able to grant themselves credits.
- **Options considered**: (1) RLS write policies + application discipline,
  (2) a DB trigger keeping balance = sum(ledger), (3) a single
  security-definer function that writes both atomically, locked to the
  service role.
- **Selected option**: (3).
- **Reason**: Makes the invariant structural (balance and ledger move in
  one transaction, overspend rejected in-DB), and revoking EXECUTE from
  end users closes the security-definer escalation hole.
- **Consequences**: Every credit mutation is a service-role RPC; the admin
  client is now used by the credits layer as well as prompts (documented
  in SECURITY.md).
- **Date**: 2026-07-28

## D-018 — Reserve after the idempotency-guarded generation row

- **Decision**: The image action creates the pending `ai_generations` row
  first (its unique `idempotency_key` blocks duplicates), THEN calls
  `reserveImageCredit(workspace, generationId)` to deduct. This completes
  the D-015 abstraction: `checkImageCredit` stays a read-only pre-flight,
  the reserve is tied to a real generation id, and refunds/charges key on
  that id.
- **Context**: Deducting before the row exists would let a duplicate that
  later loses the unique-key race leak a credit; deducting only at confirm
  would allow concurrent overspend.
- **Options considered**: (1) deduct in `checkImageCredit` pre-insert,
  (2) deduct only at confirm, (3) reserve immediately after the pending
  insert.
- **Selected option**: (3).
- **Reason**: The reservation is always backed by a real, de-duplicated
  generation; overspend is impossible and a lost race never leaks credit.
- **Consequences**: One extra service-role RPC per generation; the image
  action gained a reserve call (a credit-safety edit within Phase 08's
  mandate, callers outside the credits system unchanged).
- **Date**: 2026-07-28

## D-019 — Webhooks are the subscription source of truth

- **Decision**: `subscriptions` has no user write policy; only the
  signature-verified Paddle webhook handler (service role) mutates
  subscription state. Billing actions launch checkout / call Paddle but
  never flip our status directly.
- **Context**: Spec §16 requires that a browser redirect not activate a
  subscription, that webhooks be verified, stored, uniquely identified,
  processed once, idempotent, logged, and retryable.
- **Options considered**: (1) trust the checkout redirect / client,
  (2) optimistic client update reconciled later, (3) webhook-only writes
  with a raw event log.
- **Selected option**: (3).
- **Reason**: Only server-verified provider events can be trusted for
  money; the raw `webhook_events` log gives idempotency (unique event id),
  auditability, and retry safety.
- **Consequences**: The UI reflects state that may lag the checkout by a
  few seconds (until the webhook lands) — the billing page tells the user
  activation is confirmed by the provider, not the redirect.
- **Date**: 2026-07-30

## D-020 — Paddle via REST + Paddle.js overlay, no SDK

- **Decision**: Server-side Paddle Billing calls use `fetch`
  (`src/lib/billing/paddle.ts`); the browser opens checkout with Paddle.js
  loaded on demand from Paddle's CDN, keyed by the public client token.
- **Context**: Phase 09 needs transactions, cancel/reactivate/change, and
  webhook signature verification, while the code-quality rules discourage
  unnecessary dependencies.
- **Options considered**: (1) @paddle/paddle-node-sdk + @paddle/paddle-js,
  (2) REST + on-demand Paddle.js.
- **Selected option**: (2).
- **Reason**: A handful of endpoints and one HMAC check don't warrant the
  SDKs; keeping the surface small keeps the dependency tree flat and the
  error handling under our control. Everything degrades gracefully when
  Paddle isn't configured.
- **Consequences**: Paddle price ids live on `plans` rows (set per
  environment); if a future need (e.g. richer client events) argues for the
  SDK, it's a contained swap inside these two files.
- **Date**: 2026-07-30

## D-021 — trackEvent persists to product_events (fire-and-forget)

- **Decision**: The analytics transport (`src/lib/analytics/track.ts`) now
  writes each event to `product_events` via the service role in addition
  to the structured log, without awaiting — a failure is swallowed.
- **Context**: Phase 10 requires measurable funnel abandonment and a
  product-events store, but analytics must never block or fail a user
  action (spec §10 "feedback does not interrupt the core workflow").
- **Options considered**: (1) await the insert at every call site,
  (2) a separate explicit `recordProductEvent` at chosen funnel points,
  (3) fire-and-forget inside the existing `trackEvent`.
- **Selected option**: (3).
- **Reason**: Zero call-site churn (all existing `trackEvent` calls now
  feed the funnel), and the log remains the durable fallback if the async
  insert is cut short in a serverless environment.
- **Consequences**: In serverless, a small fraction of events may be lost
  if the function freezes right after responding; acceptable for
  analytics, and the log backstops it. Phase 11 can swap in PostHog behind
  the same function.
- **Date**: 2026-07-30

## D-022 — Audited credit adjustments via a single DB function

- **Decision**: The only manual credit-change path is the security-definer
  `admin_adjust_credits`, which writes the `credit_ledger` entry and the
  `admin_audit_logs` row in one transaction; `record_admin_action` audits
  non-financial admin actions. Both are service-role-only.
- **Context**: Spec §11 requires that credit adjustments have audit
  records and that platform-admin access is secure.
- **Options considered**: (1) adjust credits in the action layer + a
  separate audit insert, (2) a DB trigger on the ledger, (3) one
  security-definer function doing both atomically, locked to the service
  role.
- **Selected option**: (3).
- **Reason**: Atomicity makes "no unaudited adjustment" structural — a
  failed adjustment leaves neither row — and revoking EXECUTE from users
  keeps the security-definer functions unreachable from the client.
- **Consequences**: All admin money actions go through the admin client;
  the audit log is the single source for privileged-action history.
- **Date**: 2026-07-30

## D-023 — PostHog and Sentry wired behind existing seams, no SDKs

- **Decision**: PostHog capture is added inside the existing `trackEvent`
  transport (fire-and-forget REST to the capture API), and a minimal
  `reportError` (`src/lib/monitoring/sentry.ts`) POSTs to Sentry's store
  endpoint from the DSN. Both activate only when their env var is set.
- **Context**: Phase 11 lists PostHog + Sentry; the code-quality rules
  discourage unnecessary dependencies, and the analytics abstraction
  (D-006/D-021) always promised a transport swap here.
- **Options considered**: (1) posthog-node + @sentry/nextjs,
  (2) env-guarded REST behind the existing abstractions.
- **Selected option**: (2).
- **Reason**: Real, working hooks with zero new dependencies and no
  call-site churn; both degrade to structured logs / DB when unconfigured.
- **Consequences**: These are lightweight transports, not the full SDK
  feature set (no client-side autocapture, no Sentry tracing). A future
  swap to the official SDKs is contained to these two seams.
- **Date**: 2026-07-30

## D-024 — Vitest for unit tests; Playwright smoke for E2E

- **Decision**: Add Vitest (`npm test`) as the fast, dependency-light unit
  suite over pure logic, and a Playwright smoke config/spec for
  unauthenticated E2E; full authenticated journeys stay manual (per-phase
  steps + Paddle sandbox).
- **Context**: Phase 12 requires E2E, export, and RLS test coverage, but
  the build environment has no live Supabase/Paddle and no seeded users, so
  a full automated E2E of the paid journey isn't runnable here.
- **Options considered**: (1) heavy E2E requiring live services in CI,
  (2) unit tests over pure logic + smoke E2E + documented manual journeys +
  SQL RLS tests.
- **Selected option**: (2).
- **Reason**: Maximizes runnable, regression-catching coverage now (schema,
  resolver, credit/billing safety, seed-template validity all green) while
  keeping the service-dependent journeys as documented, repeatable manual
  passes. The Paddle signature verifier was extracted to a pure module to
  make it unit-testable.
- **Consequences**: CI runs `npm test` (fast, no services); Playwright and
  the SQL RLS tests run in an env with a built app + a live database.
- **Date**: 2026-07-30
