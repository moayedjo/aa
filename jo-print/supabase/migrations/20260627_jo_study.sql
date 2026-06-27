-- ============================================================
-- JO Study — AI study assistant tables, RLS, indexes
-- Created: 2026-06-27
-- Phase 1 backbone. All tables are per-user owned with strict RLS.
-- ============================================================

-- ============================================================
-- 1. study_files — uploaded educational material metadata
-- ============================================================
create table if not exists public.study_files (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  original_filename text not null,
  storage_path      text not null,
  mime_type         text not null,
  file_size         integer not null,
  page_count        integer,
  language          text not null default 'ar',
  subject           text,
  course_name       text,
  school_name       text,                 -- university or school (optional)
  semester          text,
  processing_status text not null default 'uploaded'
    check (processing_status in ('uploaded','processing','ready','error')),
  processing_error  text,
  provider_file_id  text,                 -- e.g. OpenAI file id
  vector_store_id   text,                 -- e.g. OpenAI vector store id
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz           -- soft delete
);

-- ============================================================
-- 2. study_conversations — chat sessions per file
-- ============================================================
create table if not exists public.study_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  study_file_id uuid references public.study_files(id) on delete cascade,
  title         text,
  mode          text not null default 'ask'
    check (mode in ('ask','teacher','summary','quiz','flashcard','coach','print')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 3. study_messages — individual chat turns
-- ============================================================
create table if not exists public.study_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.study_conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  citations       jsonb,                  -- [{ fileId, fileName, page, section }]
  token_usage     jsonb,                  -- { input, output }
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 4. study_summaries
-- ============================================================
create table if not exists public.study_summaries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  study_file_id     uuid references public.study_files(id) on delete set null,
  title             text not null,
  summary_type      text not null
    check (summary_type in ('quick','standard','detailed','exam_night')),
  selected_pages    text,                 -- e.g. "1-10" or "all"
  selected_sections text,
  content           text,                 -- plain-text rendering
  structured_content jsonb,               -- validated schema output
  language          text not null default 'ar',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- 5. study_quizzes
-- ============================================================
create table if not exists public.study_quizzes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  study_file_id  uuid references public.study_files(id) on delete set null,
  title          text not null,
  quiz_type      text not null
    check (quiz_type in ('multiple_choice','true_false','short_answer','essay','mixed')),
  difficulty     text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  question_count integer not null default 0,
  settings       jsonb,                   -- { timeLimit, shuffle, showAnswers, pages, chapters }
  questions      jsonb not null,          -- validated schema output (without leaking answers to client where needed)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- 6. study_quiz_attempts
-- ============================================================
create table if not exists public.study_quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  quiz_id      uuid not null references public.study_quizzes(id) on delete cascade,
  answers      jsonb not null,            -- { [questionId]: answer }
  score        numeric(5,2),
  weak_topics  jsonb,                     -- [string]
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================
-- 7. study_flashcard_sets
-- ============================================================
create table if not exists public.study_flashcard_sets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  study_file_id uuid references public.study_files(id) on delete set null,
  title         text not null,
  cards         jsonb not null,           -- validated flashcard schema
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 8. study_flashcard_progress
-- ============================================================
create table if not exists public.study_flashcard_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  flashcard_set_id uuid not null references public.study_flashcard_sets(id) on delete cascade,
  card_id          text not null,         -- card id within the set's jsonb
  status           text not null default 'new'
    check (status in ('new','known','review')),
  review_count     integer not null default 0,
  last_reviewed_at timestamptz,
  unique (user_id, flashcard_set_id, card_id)
);

-- ============================================================
-- 9. study_plans
-- ============================================================
create table if not exists public.study_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  exam_date        date,
  daily_hours      numeric(4,1) not null default 2,
  available_days   jsonb,                 -- ["sat","sun",...]
  selected_file_ids jsonb,                -- [uuid]
  plan_data        jsonb not null,        -- validated plan schema
  progress         jsonb not null default '{}'::jsonb,  -- { [taskId]: true }
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- 10. study_exports — generated print-ready documents
-- ============================================================
create table if not exists public.study_exports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  source_type text not null
    check (source_type in ('summary','quiz','answer_key','flashcards','study_plan','booklet')),
  source_id   uuid,                       -- references the source record (loose, may be cross-table)
  storage_path text not null,
  page_count  integer,
  print_mode  text not null default 'bw' check (print_mode in ('bw','color')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 11. ai_usage — cost/usage tracking
-- ============================================================
create table if not exists public.ai_usage (
  id             bigserial primary key,
  user_id        uuid references public.profiles(id) on delete set null,
  feature        text not null,           -- summary|chat|quiz|flashcard|plan|process
  model          text,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  estimated_cost numeric(10,6) not null default 0,
  request_status text not null default 'success'
    check (request_status in ('success','error','rate_limited','invalid_output')),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists study_files_user_idx        on public.study_files(user_id) where deleted_at is null;
create index if not exists study_files_status_idx       on public.study_files(processing_status);
create index if not exists study_conversations_user_idx on public.study_conversations(user_id);
create index if not exists study_conversations_file_idx on public.study_conversations(study_file_id);
create index if not exists study_messages_conv_idx      on public.study_messages(conversation_id);
create index if not exists study_summaries_user_idx     on public.study_summaries(user_id);
create index if not exists study_summaries_file_idx     on public.study_summaries(study_file_id);
create index if not exists study_quizzes_user_idx       on public.study_quizzes(user_id);
create index if not exists study_quiz_attempts_user_idx on public.study_quiz_attempts(user_id);
create index if not exists study_quiz_attempts_quiz_idx on public.study_quiz_attempts(quiz_id);
create index if not exists study_flashcard_sets_user_idx on public.study_flashcard_sets(user_id);
create index if not exists study_flashcard_progress_user_idx on public.study_flashcard_progress(user_id);
create index if not exists study_plans_user_idx         on public.study_plans(user_id);
create index if not exists study_exports_user_idx       on public.study_exports(user_id);
create index if not exists ai_usage_user_idx            on public.ai_usage(user_id);
create index if not exists ai_usage_created_idx         on public.ai_usage(created_at desc);
create index if not exists ai_usage_user_feature_day_idx on public.ai_usage(user_id, feature, created_at);

-- ============================================================
-- Row Level Security — every user-owned table
-- ============================================================
alter table public.study_files            enable row level security;
alter table public.study_conversations    enable row level security;
alter table public.study_messages         enable row level security;
alter table public.study_summaries        enable row level security;
alter table public.study_quizzes          enable row level security;
alter table public.study_quiz_attempts    enable row level security;
alter table public.study_flashcard_sets   enable row level security;
alter table public.study_flashcard_progress enable row level security;
alter table public.study_plans            enable row level security;
alter table public.study_exports          enable row level security;
alter table public.ai_usage               enable row level security;

-- Helper pattern: owner can do everything on their own rows.
-- We use explicit per-command policies for clarity and least privilege.

-- study_files (respect soft delete on select)
create policy "study_files select own" on public.study_files
  for select using (user_id = auth.uid() and deleted_at is null);
create policy "study_files insert own" on public.study_files
  for insert with check (user_id = auth.uid());
create policy "study_files update own" on public.study_files
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "study_files delete own" on public.study_files
  for delete using (user_id = auth.uid());

-- Generic owner policies for the remaining tables
do $$
declare
  t text;
  owned_tables text[] := array[
    'study_conversations','study_messages','study_summaries','study_quizzes',
    'study_quiz_attempts','study_flashcard_sets','study_flashcard_progress',
    'study_plans','study_exports'
  ];
begin
  foreach t in array owned_tables loop
    execute format($f$create policy "%1$s select own" on public.%1$s for select using (user_id = auth.uid());$f$, t);
    execute format($f$create policy "%1$s insert own" on public.%1$s for insert with check (user_id = auth.uid());$f$, t);
    execute format($f$create policy "%1$s update own" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
    execute format($f$create policy "%1$s delete own" on public.%1$s for delete using (user_id = auth.uid());$f$, t);
  end loop;
end $$;

-- ai_usage: users may read their own usage; inserts happen server-side via service role.
create policy "ai_usage select own" on public.ai_usage
  for select using (user_id = auth.uid());
-- No client insert/update/delete policies — writes are service-role only.

-- Admins can read aggregate metadata (NOT file contents — those live in storage).
create policy "Admins read study_files metadata" on public.study_files
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Admins read ai_usage" on public.ai_usage
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- updated_at trigger for study tables
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare
  t text;
  ts text[] := array[
    'study_files','study_conversations','study_summaries','study_quizzes',
    'study_flashcard_sets','study_plans'
  ];
begin
  foreach t in array ts loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;', t);
    execute format('create trigger %1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;
