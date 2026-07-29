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

## Brand assets storage (Phase 02)

- The `brand-assets` bucket is **private**; logos are only reachable via
  short-lived signed URLs created for authorized users.
- Object paths are namespaced `{workspace_id}/…`; storage policies derive
  the workspace from the first path segment: members read, owner/admin
  write/delete. A forged path targeting another workspace fails at the
  storage layer regardless of client code.
- Bucket-level limits: 2 MB max, image mime types only (also validated
  client-side before upload and re-checked by Supabase).
- `saveLogoPath` re-validates that the stored path is inside the caller's
  workspace folder, so a brand kit can never point at another workspace's
  file.

## Brand Kit authorization (Phase 02)

- Reads: any workspace member. Writes: owner/admin only — enforced by RLS
  and re-checked in server actions (`requireEditor`).
- The onboarding page redirects non-owner/admin members away; RLS remains
  the real boundary.

## Templates and admin surface (Phase 03)

- `/admin/*` is gated server-side by `isPlatformAdmin()` (user_roles
  lookup); every admin action re-checks it, and RLS blocks all catalog and
  template writes for non-admins regardless of routing.
- Normal users can only select `published` templates; drafts and their
  versions are invisible at the database level.
- `template_versions` has **no update/delete policies** — versions are
  immutable even to admins. Publishing re-validates the current version's
  JSON with Zod; invalid JSON cannot be published, and invalid stored JSON
  is skipped (never rendered) by user-facing queries.
- All template JSON is Zod-validated server-side before insert; unknown
  `{{variables}}` are rejected.

## Designs and editor (Phase 04)

- Designs are workspace-isolated by RLS; viewers are read-only at the
  database level, and the editor route additionally redirects them.
- Design JSON only accepts **internal** asset references
  (`supabase://brand-assets/…` or `supabase://design-assets/…`) — external
  image URLs are rejected by the Zod schema, so uncontrolled URLs can
  never enter the canvas. Signed URLs are minted server-side per load and
  never persisted.
- Uploads go to the private `design-assets` bucket under
  `{workspace_id}/{design_id}/…`; storage RLS restricts writes to
  owner/admin/editor of that workspace. `registerDesignAsset` re-validates
  the path prefix.
- Locked (non-editable) layers are enforced in the store's single update
  path — and the saved JSON is Zod-validated server-side on every save.

## Versions, trash and export (Phase 05)

- Version history is append-only: `design_versions` has no update/delete
  policies for any role, and version snapshots are taken **server-side**
  from the stored design, so a compromised client cannot poison history.
- Restore always writes a `pre-restore` snapshot before changing anything.
- Trash is a soft delete (`deleted_at`); permanent deletion requires
  owner/admin (RLS-enforced) and a prior trash step in the action layer.
- Export runs client-side from already-authorized signed URLs; export
  attempts (including failures and their reasons) are recorded in
  `design_exports` for the quality metrics.

## AI copy (Phase 06)

- `GEMINI_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix; used inside
  `src/lib/ai/gemini.ts`, a `server-only` module). Provider error bodies
  are never forwarded to the client.
- Prompts are platform IP: RLS hides `prompt_templates`/`prompt_versions`
  from every user session. The generation actions read the current prompt
  version through `createAdminClient()` — the second audited service-role
  usage (after none in Phases 01–05). Prompt versions are immutable.
- All AI output is Zod-validated (`aiCopySchema` / per-field schemas)
  before it is stored or returned; invalid output is retried once, then
  logged as a failed generation with a safe error.
- Generation runs never write to `design_json`. Applying copy is an
  explicit user action into an editable text layer, clipped to the
  layer's `maxCharacters` — an AI failure cannot corrupt a design.
- `ai_generations` is append-only (no update/delete policies) and
  workspace-isolated; inputs stored there are the sanitized request
  fields only.

## AI images and credit safety (Phase 07)

- Generated images are **stored in Supabase Storage before the client ever
  sees them**. The action returns an internal `supabase://design-assets/…`
  ref plus a short-lived signed URL; no external or provider URL can enter
  the canvas (the design schema rejects anything else).
- The image prompt sent to the provider is always
  `user scene + server-side composition rules` (no text, no logos, no
  watermarks, no graphic procedures, no fake before/after, negative space).
  The rules are appended in `buildImagePrompt` and cannot be stripped by
  the client.
- **Credit safety**: validate → balance check → reserve (pending
  `ai_generations` row) → generate → store → confirm. Any failure marks
  the reservation `failed` and refunds it, so a failed generation never
  consumes a final credit. The wallet/ledger writes behind
  `src/lib/credits/reservation.ts` are filled in by Phase 08 without
  changing this flow.
- **Idempotency**: the client sends one key per submission; a unique
  partial index on `idempotency_key` makes a duplicate reservation
  impossible. A repeated request returns the original result instead of
  charging again, and a concurrent duplicate loses the unique-violation
  race safely.
- RLS lets a creator finish only **their own pending** row; completed and
  failed rows are immutable, so charge/refund history cannot be rewritten.
- Generation never writes `design_json` — applying an image is an explicit
  user action, so a failure leaves the design untouched.

## Checklist for every future phase

- [ ] New tables: RLS enabled + policies written in the same migration.
- [ ] New server actions: Zod-validate input, re-check auth server-side.
- [ ] No new env var with a secret is ever prefixed `NEXT_PUBLIC_`.
- [ ] Any service-role usage goes through `admin.ts` and is documented here.
- [ ] RLS tests extended in `supabase/tests/`.
