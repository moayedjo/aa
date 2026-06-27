-- ============================================================
-- JO Study — idempotency store for expensive AI generation requests.
-- Created: 2026-06-28
-- A (user_id, key) pair maps to one generation. Repeated requests with the
-- same key return the stored result instead of re-running a paid AI call.
-- ============================================================
-- Store extracted text + char count on study_files for AI grounding.
alter table public.study_files
  add column if not exists extracted_text text,
  add column if not exists char_count integer;

create table if not exists public.study_idempotency (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  idem_key    text not null,
  feature     text not null,                 -- summary|quiz|flashcards|export
  status      text not null default 'pending'
    check (status in ('pending','completed','failed')),
  result      jsonb,                          -- { id: <created row id>, ... }
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, idem_key, feature)
);

create index if not exists study_idempotency_user_idx on public.study_idempotency(user_id);

alter table public.study_idempotency enable row level security;

-- Users may read their own idempotency records; writes are service-role only
-- (the server orchestrates pending → completed/failed transitions).
drop policy if exists "study_idempotency select own" on public.study_idempotency;
create policy "study_idempotency select own" on public.study_idempotency
  for select using (user_id = auth.uid());

drop trigger if exists study_idempotency_touch on public.study_idempotency;
create trigger study_idempotency_touch before update on public.study_idempotency
  for each row execute function public.touch_updated_at();
