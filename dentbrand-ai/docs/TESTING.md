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

## RLS tests (Phase 02)

`supabase/tests/phase02_rls_tests.sql` — same pattern as Phase 01.
Verifies: members can read a brand kit, a viewer cannot write it, an owner
can create their own, industry settings follow the same gate, and (as
documented manual checks) the brand-assets storage policies.

## Manual testing steps — Phase 02

Prereq: migrations 0001 + 0002 applied, signed-in owner of a workspace.

1. **Entry**: create a new workspace → you land on `/onboarding/{id}`.
2. **Identity**: set business name, upload a logo (PNG < 2 MB) → preview
   shows both; "Save & continue" advances.
3. **Colors**: change colors → the live preview updates immediately; save.
4. **Fonts**: pick an Arabic and an English font; save.
5. **Contact**: enter phone (invalid format is rejected), optional
   website/address; save.
6. **Language/RTL**: choose العربية → the live preview flips to RTL with
   Arabic sample copy. Choose English → back to LTR.
7. **Services**: select several dental services; save.
8. **Finish**: review shows the completion score; finish → redirected to
   the workspace page showing the Brand Kit card with score and swatches.
9. **Save progress**: mid-wizard, hard-refresh → the wizard resumes at
   your last completed step with saved values; data also appears after
   sign-out/sign-in.
10. **Roles**: as a viewer member of the workspace, `/onboarding/{id}`
    redirects to the workspace page; the Brand Kit card shows no edit link.
11. **Isolation**: as another user (no membership), `/onboarding/{id}` and
    the workspace page are 404; a direct storage download of the logo URL
    path without a signed URL fails.
12. **Analytics**: server logs show `onboarding_started`,
    `onboarding_step_completed` (per step), `onboarding_logo_uploaded`,
    and `onboarding_completed` events.

## Future phases

Each phase adds its own section here (Phase 03: template quality checklist;
Phase 05: export/recovery tests; Phase 12: E2E suite).
