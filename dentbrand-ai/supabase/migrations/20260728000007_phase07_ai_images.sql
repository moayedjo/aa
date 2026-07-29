-- =============================================================================
-- Phase 07 — AI Images and Credit Safety
-- Extends ai_generations with the image kind, a pending (reservation)
-- status, idempotency keys and the stored asset path. The pending row IS
-- the credit reservation record; Phase 08's wallet/ledger plugs into the
-- same flow (see src/lib/credits/reservation.ts).
-- =============================================================================

alter table public.ai_generations
  drop constraint ai_generations_kind_check;
alter table public.ai_generations
  add constraint ai_generations_kind_check check (kind in ('copy', 'image'));

alter table public.ai_generations
  drop constraint ai_generations_status_check;
alter table public.ai_generations
  add constraint ai_generations_status_check
  check (status in ('pending', 'completed', 'failed'));

-- Client-supplied idempotency key: a duplicate submission reuses the same
-- key and is rejected by this unique index instead of double-charging.
alter table public.ai_generations add column idempotency_key text
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 80);
create unique index ai_generations_idempotency_idx
  on public.ai_generations (idempotency_key)
  where idempotency_key is not null;

-- Storage path of the generated image (design-assets bucket).
alter table public.ai_generations add column asset_path text;

-- Generated images are design assets too.
alter table public.design_assets
  drop constraint design_assets_kind_check;
alter table public.design_assets
  add constraint design_assets_kind_check check (kind in ('upload', 'generated'));

-- Reservation lifecycle: the creator may finish their own PENDING row as
-- completed or failed. Completed/failed rows stay immutable (the using
-- clause only matches pending), preserving append-only history.
create policy "ai_generations: finish own pending"
  on public.ai_generations for update
  to authenticated
  using (
    created_by = (select auth.uid())
    and status = 'pending'
    and public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
  )
  with check (status in ('completed', 'failed'));
