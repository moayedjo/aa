# DentBrand AI — Beta Launch Plan & Go/No-Go

## Definition of done (from the product spec)

A new user can, without manual intervention: Signup → Create Workspace →
Complete Brand Kit → Select Service → Select Content Goal → Select
Template → Generate Copy → Generate/Upload Image → Edit Design → Autosave →
Restore Version → Export PNG → View Usage → Subscribe → Cancel.

Every step above is implemented (Phases 01–11). Phase 12 adds the QA
harness, legal pages, runbook, and this launch gate.

## Pre-launch setup

1. Create the production Supabase project; apply
   `supabase/migrations/*.sql` in order, then `supabase/seed.sql`.
2. Set all env vars from `.env.example` (Supabase, Gemini, Paddle,
   Resend/PostHog/Sentry as used).
3. Create the Paddle catalog; put each plan's price ids on the `plans`
   rows (`paddle_price_id_month` / `_year`).
4. Grant one platform admin: `update user_roles set role='platform_admin'
   where user_id='…'`.
5. Complete the launch tasks in `docs/SECURITY-REVIEW.md`.

## Automated QA (run and record)

- `npm run lint` → 0 errors/warnings
- `npm run typecheck` → pass
- `npm test` → Vitest unit suite green (schema/resolver/credit/billing/
  seed-template validation)
- `npm run build` → success
- `npx playwright test` → smoke E2E green (against a built, env-configured
  app)
- `supabase/tests/phase*_rls_tests.sql` → all pass on the production DB

## Manual QA passes

- **Full journey**: run the definition-of-done end to end (docs/TESTING.md
  per-phase steps).
- **RTL**: Arabic designs render right-to-left in the editor and export.
- **Responsive/mobile**: dashboard, onboarding, billing, and marketing
  pages usable on a phone (Playwright includes a mobile project).
- **Accessibility**: forms have labels; buttons/roles are reachable by
  keyboard; color contrast on templates is checked in the quality
  checklist.
- **Performance**: dashboard and editor load within budget on a mid-range
  device; export completes for the seeded templates.
- **Paddle sandbox**: subscribe, cancel, reactivate, upgrade/downgrade,
  past-due — all reflected from webhooks.

## Content readiness

- [x] 12 production dental templates (`supabase/seed.sql`), all
      schema-validated by `seed.test.ts` — meets the 10–15 target.
- [x] Legal pages: Privacy, Terms, Refund Policy.
- [x] Runbook: backup + incident procedures.

## Go / No-Go gate

Launch only when ALL are true:

- [ ] No critical errors in a full journey run.
- [ ] No data leakage (RLS tests pass on production).
- [ ] Export is reliable (PNG matches editor; missing assets block with a
      clear message).
- [ ] Cancellation works from inside the app.
- [ ] Credit refunds work (failed generation → refunded, visible on usage).
- [ ] Five beta users complete the full workflow.
- [ ] At least three beta users indicate willingness to pay.

## Beta cohort plan

- Recruit five dental clinics; create a workspace each (they self-serve
  from signup — no manual DB edits needed).
- Seed each with a short onboarding call; watch the activation funnel in
  `/admin` (product_events) for drop-off.
- Collect willingness-to-pay via the in-app feedback widget and a short
  follow-up. Track satisfaction from the in-editor design rating.
- Weekly review of KPIs (export success, AI failure/refund rates,
  activation funnel) and support tickets (`/admin/support`).
