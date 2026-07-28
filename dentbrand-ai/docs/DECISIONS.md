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
