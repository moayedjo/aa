# DentBrand AI — Security

## Principles

1. **RLS is the security boundary.** Route protection (proxy redirects,
   server-side `getUser()` checks) is UX; the database enforces isolation.
2. **Default deny.** Every table has RLS enabled; access exists only where
   a policy explicitly grants it.
3. **Secrets stay server-side.** Only `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the browser — both are designed
   to be public and grant nothing without RLS.
4. **Service role is server-only.** `SUPABASE_SERVICE_ROLE_KEY` is read
   only inside `src/lib/supabase/admin.ts`, which imports `"server-only"`
   so any client-side import fails the build. Phase 01 runtime code never
   uses it.
5. **All external input is Zod-validated** in server actions before it
   touches Supabase (`src/lib/validation/`).

## Platform admin

Platform-admin status lives exclusively in the `user_roles` table.

- It is **not** stored in profile fields, auth metadata, or anything a
  client can write.
- `user_roles` has **no insert/update/delete policies** — the only way to
  grant `platform_admin` is via the service role on the server (an audited
  admin flow arrives in Phase 11).
- Policies check it via the `is_platform_admin()` security-definer function.

## Workspace isolation

- All Phase 01 policies resolve membership through security-definer helper
  functions pinned to `search_path = public`, avoiding both RLS recursion
  and search-path hijacking.
- A workspace a user doesn't belong to is indistinguishable from a
  nonexistent one (queries return no rows → UI shows 404).
- Verified by `supabase/tests/phase01_rls_tests.sql`.

## Auth flow hardening

- Session cookies are refreshed on every request by `src/proxy.ts`.
- The auth callback restricts `next` redirects to same-origin relative
  paths (no `//` open-redirect).
- Login failures return a generic "Invalid email or password".
- Forgot-password always responds neutrally (no account enumeration).
- Password minimum 8 chars, max 72 (bcrypt limit).
- Triggers that write to protected tables are `security definer` with a
  pinned `search_path`.

## Checklist for every future phase

- [ ] New tables: RLS enabled + policies written in the same migration.
- [ ] New server actions: Zod-validate input, re-check auth server-side.
- [ ] No new env var with a secret is ever prefixed `NEXT_PUBLIC_`.
- [ ] Any service-role usage goes through `admin.ts` and is documented here.
- [ ] RLS tests extended in `supabase/tests/`.
