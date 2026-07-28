# DentBrand AI — Testing

## Automated checks (run after every phase)

```bash
npm run lint        # ESLint — must be 0 errors, 0 warnings
npm run typecheck   # tsc --noEmit — must pass (strict mode)
npm run build       # next build — must succeed
```

## RLS tests (Phase 01)

`supabase/tests/phase01_rls_tests.sql` — run in the Supabase SQL editor
(or psql as `postgres`) against a database with the Phase 01 migration
applied. The file creates two users + two workspaces inside a transaction,
simulates JWTs with `set local request.jwt.claims`, asserts isolation, and
rolls back. Each SELECT returns a `pass` boolean; the commented blocks
(forged inserts, self-granted admin) must error / affect 0 rows when
uncommented.

Covered:

1. A user sees only their own workspace.
2. A user sees only members of their own workspace.
3. A user sees only their own profile when no workspace is shared.
4. Inserting a workspace with a forged `created_by` is rejected.
5. Adding yourself to a foreign workspace is rejected.
6. Granting yourself `platform_admin` is impossible (no write policy).
7. Anonymous sessions see zero rows everywhere.

## Manual testing steps — Phase 01

Prereq: a Supabase project with the migration applied, `.env.local` filled
from `.env.example`, `npm run dev`.

1. **Signup**: `/signup` → create an account → success message; confirm the
   email (or auto-confirm in Supabase settings) → a `profiles` row and a
   `user_roles` row (`user`) exist.
2. **Login/session**: `/login` → lands on `/dashboard`; hard-refresh —
   still signed in.
3. **Protected routes**: open `/dashboard` in a private window → redirected
   to `/login?next=/dashboard`.
4. **Auth pages when signed in**: visit `/login` while signed in →
   redirected to `/dashboard`.
5. **Workspace creation**: create a workspace from the dashboard →
   redirected to its page; you appear in Members as `owner`.
6. **Isolation**: sign up a second user in another browser; paste the first
   user's workspace URL → 404. Dashboard shows only their own workspaces.
7. **Forgot password**: `/forgot-password` → neutral confirmation; email
   link → `/reset-password` → new password → signed in at `/dashboard`.
8. **Logout**: Sign out → back at `/login`; `/dashboard` redirects again.
9. **Health check**: `GET /api/health` → `{"status":"ok",...}`.
10. **Service-role exposure**: view page source / client bundles — no
    `SUPABASE_SERVICE_ROLE_KEY` anywhere (only `NEXT_PUBLIC_*` values).

## Future phases

Each phase adds its own section here (Phase 03: template quality checklist;
Phase 05: export/recovery tests; Phase 12: E2E suite).
