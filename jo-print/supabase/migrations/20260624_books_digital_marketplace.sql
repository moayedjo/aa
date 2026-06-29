-- Migration: expand books table for digital marketplace
-- Run after initial schema

alter table public.books
  add column if not exists cover_url text,
  add column if not exists file_path text,
  add column if not exists discount_price numeric(10,3),
  add column if not exists rating numeric(3,2) default 5.0,
  add column if not exists rating_count integer default 0,
  add column if not exists sales_count integer default 0,
  add column if not exists language text not null default 'ar',
  add column if not exists semester text,
  add column if not exists university text,
  add column if not exists faculty text,
  add column if not exists specialization text,
  add column if not exists level text not null default 'school'
    check (level in ('school','tawjihi','university')),
  add column if not exists includes_questions boolean default false,
  add column if not exists includes_answers boolean default false,
  add column if not exists includes_exams boolean default false,
  add column if not exists has_print_version boolean default false,
  add column if not exists badge text check (badge in ('bestseller','new','recommended','discount','tawjihi')),
  add column if not exists author text,
  add column if not exists is_featured boolean default false,
  add column if not exists download_limit integer default 5,
  add column if not exists updated_at timestamptz default now();

-- Track purchases for digital downloads
create table if not exists public.book_purchases (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  purchase_type text not null default 'digital' check (purchase_type in ('digital','print','bundle')),
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.book_purchases enable row level security;

-- Policies
create policy "Users view own purchases" on public.book_purchases for select
  using (user_id = auth.uid());
create policy "Service insert purchases" on public.book_purchases for insert
  with check (true);
create policy "Admins all purchases" on public.book_purchases for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Book reviews (only verified buyers)
create table if not exists public.book_reviews (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null not null,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (book_id, user_id)
);
alter table public.book_reviews enable row level security;
create policy "Public read reviews" on public.book_reviews for select using (true);
create policy "Buyers write reviews" on public.book_reviews for insert
  with check (
    auth.uid() = user_id and
    exists (select 1 from public.book_purchases where book_id = book_reviews.book_id and user_id = auth.uid())
  );

-- Download log
create table if not exists public.book_download_log (
  id bigserial primary key,
  book_id uuid references public.books(id) not null,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.book_download_log enable row level security;
create policy "Admins read download log" on public.book_download_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Service insert download log" on public.book_download_log for insert with check (true);

-- Performance indexes
create index if not exists books_level_idx on public.books(level);
create index if not exists books_subject_idx on public.books(subject);
create index if not exists books_sales_count_idx on public.books(sales_count desc);
create index if not exists book_purchases_user_id_idx on public.book_purchases(user_id);
create index if not exists book_purchases_book_id_idx on public.book_purchases(book_id);
