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

## RLS tests (Phase 03)

`supabase/tests/phase03_rls_tests.sql` — catalog readable by all
authenticated users; normal users see published templates only (drafts and
their versions invisible); normal users cannot write; admin sees drafts and
can change status; **nobody** (admin included) can update an existing
template version.

## Template Quality Checklist (Phase 03)

Before publishing any template, verify in the admin preview (both EN and
AR) and after Phase 04+ in the real editor/export:

- [ ] Arabic text renders RTL with correct alignment
- [ ] English text renders LTR with correct alignment
- [ ] Short headline (1–2 words) doesn't break the layout
- [ ] Longest allowed headline (maxCharacters) fits without clipping
- [ ] Horizontal logo fits the logo slot; square logo fits too
- [ ] Light brand colors keep text readable; dark brand colors too
- [ ] Portrait photo and product/service photo both work in image slots
- [ ] Long contact info (phone + website) doesn't overflow the footer
- [ ] Layer ids unique; editable/locked flags correct; zIndex order sane
- [ ] JSON validates (the admin editor blocks saving otherwise)

Export-related items (PNG at real dimensions, Arabic font embedding) are
verified from Phase 05 when export exists.

## Manual testing steps — Phase 03

Prereq: migrations 0001–0003 applied, `supabase/seed.sql` run, one
platform admin (set via SQL: `update user_roles set role='platform_admin'
where user_id='…'`), one normal user with an onboarded workspace.

1. **Gallery**: workspace page → "Browse templates" → five templates
   render with YOUR brand colors, logo, business name and contacts.
2. **Language toggle**: switch العربية ↔ English → previews flip RTL/LTR
   with Arabic/English sample copy.
3. **Published-only**: in admin, move a template from published → archived
   → it disappears from the user gallery (refresh); move back via
   archived → draft → … → published.
4. **Admin gate**: as a normal user, `/admin/templates` redirects to
   `/dashboard`.
5. **Admin CRUD**: create a template from the starter JSON → it appears as
   draft; edit JSON with an unknown `{{variable}}` → save is rejected with
   the Zod error; fix it → saves as v2 and version history shows v1 + v2.
6. **Status flow**: draft → testing → approved → published works; illegal
   jumps (draft → published) are rejected.
7. **Immutability**: in SQL, try updating an old template_versions row as
   any user → 0 rows updated.
8. **Onboarding still works**: the wizard's industry and services steps now
   load from the database (same options as before).

## Future phases

Each phase adds its own section here (Phase 05: export/recovery tests;
Phase 12: E2E suite).
