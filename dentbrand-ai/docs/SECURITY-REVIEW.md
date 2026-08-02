# DentBrand AI — Pre-Launch Security Review

Date: 2026-07-30. Reviewer: platform engineering. Scope: the full MVP
(Phases 01–11). This complements `SECURITY.md` (which documents the
controls per phase) with a launch-gate checklist.

## Summary

No critical findings outstanding. All customer data is workspace-isolated
by Row Level Security with default-deny; all privileged mutations go
through service-role-only, security-definer functions; secrets are
server-only.

## Checklist

- [x] **RLS default-deny** on every table; policies reviewed per phase
      (`SECURITY.md`) and covered by `supabase/tests/phase*_rls_tests.sql`.
- [x] **Workspace isolation**: a foreign workspace is indistinguishable
      from a nonexistent one (404); verified in Phase 01/04 tests.
- [x] **Platform-admin** status only in `user_roles` (no client-writable
      field); `user_roles` has no write policy.
- [x] **Service-role key** used only in `src/lib/supabase/admin.ts`
      (`server-only`); never shipped to the client.
- [x] **Security-definer functions** (`apply_credit_change`,
      `ensure_wallet_period`, `increment_usage`, `apply_plan_allowance`,
      `admin_adjust_credits`, `record_admin_action`) have `EXECUTE` revoked
      from `anon`/`authenticated`, granted only to `service_role`.
- [x] **Credit integrity**: balance changes only via ledger-writing
      functions; overspend rejected in-DB; every adjustment audited
      atomically.
- [x] **Billing**: webhooks are the source of truth; signatures verified
      (HMAC, constant-time, skew window — unit-tested); events processed
      exactly once; a redirect cannot activate a subscription.
- [x] **AI safety**: provider keys server-only; output Zod-validated;
      generation never writes design JSON; image composition/safety rules
      appended server-side; failed generations refunded, never charged.
- [x] **Uploads**: private buckets, workspace-scoped paths, mime/size
      limits; design JSON rejects external image URLs (internal refs only).
- [x] **Input validation**: all server actions Zod-validate input.
- [x] **Auth hardening**: neutral login/forgot-password responses; open
      redirect guarded in the auth callback; session refresh in the proxy.
- [x] **Secrets**: only `NEXT_PUBLIC_*` values reach the browser
      (Supabase URL/anon key, Paddle client token) — all designed public.
- [x] **CSP / headers**: review `next.config` headers before launch (add a
      strict CSP for production — tracked as a launch task).

## Launch tasks (do before opening the beta)

- [ ] Add a production Content-Security-Policy header.
- [ ] Run every `supabase/tests/phase*_rls_tests.sql` against the
      production database and record results.
- [ ] Confirm Supabase backups + retention; run one restore drill.
- [ ] Set all production secrets; verify no `NEXT_PUBLIC_` secret leaked.
- [ ] Paddle sandbox end-to-end: subscribe, cancel, reactivate, past-due.
