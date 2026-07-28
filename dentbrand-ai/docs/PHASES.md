# DentBrand AI — Phases

Built one approved phase at a time. A phase begins only after an explicit
command of the form `APPROVE PHASE NN AND CONTINUE TO PHASE MM`. Never
build ahead, never create future tables/routes/dependencies.

| Phase | Name | Status |
|---|---|---|
| 00 | Bootstrap and Architecture | ✅ Complete (delivered together with 01 as its prerequisite) |
| 01 | Auth, Workspaces and Security | ✅ Complete — approved |
| 02 | Activation Onboarding and Brand Kit | ✅ Complete — approved |
| 03 | Vertical Content and Templates | ✅ Complete — approved |
| 04 | First Design Flow and Editor Foundation | ✅ Complete — approved |
| 05 | Autosave, Recovery and Export | ✅ Complete — approved |
| 06 | AI Copy | ✅ Complete — awaiting approval |
| 07 | AI Images and Credit Safety | ⛔ Not started |
| 08 | Credits and Usage Transparency | ⛔ Not started |
| 09 | Transparent Billing | ⛔ Not started |
| 10 | Guided Experience and Support | ⛔ Not started |
| 11 | Admin and Product Analytics | ⛔ Not started |
| 12 | QA and Beta Launch | ⛔ Not started |

## Phase gate procedure (every phase)

1. Inspect the repository and read `docs/` + `BUILD_LOG.md`.
2. Identify what exists; preserve working code.
3. Provide a concise checklist for the current phase.
4. Implement only the current phase.
5. Run lint, typecheck, build, and phase tests; fix current-phase failures.
6. Update documentation (`BUILD_LOG.md` always; `DECISIONS.md` as needed).
7. Provide manual testing steps.
8. Stop and wait for the approval command.

## Hard rules

- Reliability before AI: Phase 06+ may not begin until Phase 05's
  autosave/recovery/export acceptance passes.
- Credits are never consumed by failed generations (Phase 07+).
- Paddle webhooks — not redirects — activate subscriptions (Phase 09).
- Do not edit an applied migration; add a new one.

Full per-phase implementation and acceptance lists live in the master
prompt document; the summaries above are the working reference.
