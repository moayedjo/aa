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

## RLS tests (Phase 04)

`supabase/tests/phase04_rls_tests.sql` — outsiders can't see or touch
designs; viewers read but can't write or create; owners/editors write;
design_assets isolated; documented storage checks for the design-assets
bucket.

## Manual testing steps — Phase 04

Prereq: migrations 0001–0004 + seed.sql applied; an onboarded workspace
with brand colors, fonts and a logo.

1. **Create flow**: workspace page → "Create design" → pick a service, a
   goal, and a template (previews show your brand) → optional name →
   "Create design" → the editor opens with a pre-filled design.
2. **Brand applied**: canvas shows your colors, fonts, business name,
   phone/website and logo without any manual step.
3. **Edit text**: select the headline → type in the properties panel →
   canvas updates live; the character counter blocks input past
   maxCharacters; font size and alignment work.
4. **Colors**: change a text/shape color via brand swatches and the custom
   picker.
5. **Replace image**: select the image slot → upload a JPG → it renders in
   the slot (cover); "Fit inside" switches to contain; files over 5 MB or
   wrong types are rejected.
6. **Move layers**: drag the headline — it moves and X/Y update. Select a
   locked layer (e.g. footer band): drag does nothing, panel shows the
   locked notice, dashed selection outline appears.
7. **RTL**: create a second design with العربية → Arabic sample text
   renders right-aligned RTL with the Arabic brand font.
8. **Responsive canvas**: resize the window — the canvas scales visually;
   saved JSON still stores 1080×1350 coordinates.
9. **Save**: edit → "Unsaved changes" appears → Save → "All changes
   saved"; reload the editor → edits persisted. Closing the tab with
   unsaved changes triggers the browser warning.
10. **Permissions**: a viewer member sees designs listed but has no
    Create button and `/editor/{id}` redirects them; another workspace's
    user gets 404 on the design; the design list on the workspace page
    shows the new designs.

## RLS tests (Phase 05)

`supabase/tests/phase05_rls_tests.sql` — version immutability (owners
cannot update or delete history), export record inserts, soft delete via
update, and isolation for outsiders and viewers.

## Manual testing steps — Phase 05

Prereq: migrations 0001–0005 + seed.sql applied; a design created in
Phase 04 testing.

1. **Autosave**: edit text → "Unsaved changes" → after ~2s "Saving…" then
   "All changes saved" with no clicks; reload → the edit persisted.
2. **Failed save is visible**: go offline (devtools) → edit → status shows
   "Save failed … — retrying" in red; go online → autosave recovers to
   "All changes saved".
3. **Local recovery**: edit, then close the tab within 2s (accept the
   browser warning before autosave fires) → reopen the design → the
   recovery banner appears → "Restore them" brings the edit back and
   autosave persists it. "Discard" leaves the server state.
4. **Undo/redo**: make several edits → Ctrl+Z steps back, Ctrl+Shift+Z /
   Ctrl+Y forward; header buttons match; undone state autosaves.
5. **Versions**: press "Save version" → v1 appears; keep editing (10
   autosaves) → a checkpoint version appears; press Restore on an older
   version → canvas returns to that state AND a "Before restore" version
   of the newer state exists — nothing is lost.
6. **Duplicate**: My designs → Duplicate → "Copy of …" appears with the
   same content.
7. **Trash**: Trash a design → it leaves the list and `/editor/{id}`
   redirects to Trash; Restore brings it back; as owner/admin,
   "Delete forever" (confirmation required) removes it permanently — as
   editor the button is absent.
8. **Export PNG**: on a design with all slots filled → Export PNG
   downloads a file; verify it is exactly 1080×1350 and matches the
   canvas (colors, layout, fonts).
9. **Arabic export**: export an Arabic design → text is RTL with the
   Arabic brand font, matching the editor.
10. **Missing assets block export**: on a design with an empty image slot
    (or no logo uploaded) → Export shows "Export blocked: …" naming the
    slot, no file downloads, and a failed row appears in design_exports.
11. **Dimensions guard**: exported PNGs record completed rows with
    1080×1350 in design_exports.

## RLS tests (Phase 06)

`supabase/tests/phase06_rls_tests.sql` — prompts invisible to user
sessions (readable by platform admins only), generation logs isolated per
workspace and append-only, prompt versions immutable even for admins.

## Manual testing steps — Phase 06

Prereq: migrations 0001–0006 + seed.sql applied; `GEMINI_API_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` set server-side; an English and an Arabic
design open in the editor.

1. **Key safety**: check the browser network tab and bundles — no Gemini
   key anywhere; AI requests only hit your own server actions.
2. **Generate (EN)**: in the editor's AI copy panel pick a service, goal
   and tone → Generate → 3 headlines, body, 3 CTAs, caption + hashtags,
   image prompt appear; an ai_generations row exists with prompt version,
   model and duration.
3. **Generate (AR)**: on the Arabic design → output is Arabic (hashtags
   included), imagePrompt stays English.
4. **Apply**: click Apply on a headline → the canvas headline updates and
   autosaves; same for body and CTA. Text longer than the layer's
   maxCharacters is clipped on apply.
5. **Partial regeneration**: "Shorten" on body → only bodyText changes;
   headlines/caption stay; a partial ai_generations row is logged.
6. **Keep previous result**: after regenerating, the Results dropdown
   offers "Previous result n" — selecting it brings the old pack back;
   after a page reload, previous full packs still appear (loaded from
   ai_generations).
7. **Offer honesty**: generate with no offer details → output contains no
   prices/discounts; with "20% off in July" → the offer appears verbatim.
8. **Safe failure**: temporarily unset GEMINI_API_KEY (or disconnect) →
   Generate shows a clean error, the design is untouched, a failed row is
   logged with the error; the canvas keeps working.
9. **Viewer**: viewers have no editor access (Phase 04) — AI is
   automatically out of reach; verify the action also rejects them
   directly if called.
10. **Medical disclaimer**: generate for a treatment-heavy topic → the
    disclaimer hint appears when medicalDisclaimerNeeded is true.

## RLS tests (Phase 07)

`supabase/tests/phase07_rls_tests.sql` — reservation (pending) creation,
idempotency-key uniqueness, creator can confirm their own pending row,
completed rows immutable, outsiders cannot finish someone else's
reservation.

## Manual testing steps — Phase 07

Prereq: migrations 0001–0007 + seed.sql applied; `GEMINI_API_KEY` set; a
design with an editable image slot open in the editor.

1. **Cost disclosure**: the AI image panel shows "Uses 1 image credit"
   before you generate anything.
2. **Generate**: enter a scene → Generate → progress text appears → the
   image lands in the slot on the canvas and in the history grid; the
   design autosaves.
3. **Stored before use**: check the design-assets bucket — the file exists
   under `{workspace}/{design}/ai-*.png`; the canvas URL is a signed
   Supabase URL, never a provider URL.
4. **Content rules**: generated images contain no text, no logos, no
   watermark, and leave clear space for the overlay.
5. **Keep previous image**: generate a second image → the first stays in
   the history grid; "Use" puts it back into the slot.
6. **Failed generation is free**: temporarily set an invalid
   `GEMINI_API_KEY` → Generate → clean error, canvas untouched; in SQL the
   `ai_generations` row is `failed` (not `completed`), and the server log
   shows `reservation_refunded`.
7. **No double charge**: while a generation is in flight, click Generate
   again → "already in progress" rather than a second reservation. After
   success, replaying the same idempotency key returns the same image
   with no new row.
8. **Reload persistence**: refresh the editor → previously generated
   images still appear in the history grid (loaded from ai_generations).
9. **Export**: a design using a generated image exports to PNG with the
   image present (Phase 05 export validation blocks on missing assets).
10. **Permissions**: a viewer cannot reach the editor; calling the action
    directly as a non-editor returns a permission error with no
    reservation created.

## Future phases

Each phase adds its own section here (Phase 08: credit ledger tests;
Phase 12: E2E suite).
