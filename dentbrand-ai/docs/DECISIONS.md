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
