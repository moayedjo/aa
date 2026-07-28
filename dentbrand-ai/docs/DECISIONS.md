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
