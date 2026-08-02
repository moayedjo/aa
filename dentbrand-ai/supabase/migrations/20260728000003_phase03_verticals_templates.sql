-- =============================================================================
-- Phase 03 — Vertical Content and Templates
-- Tables: industry_verticals, services, content_goals, template_categories,
--         templates, template_services, template_versions
-- Catalog data (verticals/services/goals/categories) is readable by all
-- authenticated users; only platform admins write. Normal users see
-- published templates only. Template versions are immutable.
-- =============================================================================

create type public.template_status as enum
  ('draft', 'testing', 'approved', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- Catalog tables
-- ---------------------------------------------------------------------------

create table public.industry_verticals (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (char_length(key) between 2 and 40),
  label_en text not null,
  label_ar text not null,
  is_available boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.industry_verticals (id) on delete cascade,
  key text not null check (char_length(key) between 2 and 60),
  label_en text not null,
  label_ar text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (vertical_id, key)
);

create table public.content_goals (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.industry_verticals (id) on delete cascade,
  key text not null check (char_length(key) between 2 and 60),
  label_en text not null,
  label_ar text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (vertical_id, key)
);

create table public.template_categories (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.industry_verticals (id) on delete cascade,
  key text not null check (char_length(key) between 2 and 60),
  label_en text not null,
  label_ar text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (vertical_id, key)
);

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.industry_verticals (id),
  category_id uuid references public.template_categories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  description text,
  status public.template_status not null default 'draft',
  current_version integer not null default 0,
  supported_languages text[] not null default array['ar', 'en'],
  canvas_width integer not null default 1080 check (canvas_width between 100 and 4000),
  canvas_height integer not null default 1350 check (canvas_height between 100 and 4000),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index templates_vertical_status_idx on public.templates (vertical_id, status);

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- Immutable snapshots. A design (Phase 04+) references template_id +
-- version so later template updates never corrupt existing designs.
create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  version integer not null check (version >= 1),
  template_json jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table public.template_services (
  template_id uuid not null references public.templates (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (template_id, service_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.industry_verticals enable row level security;
alter table public.services enable row level security;
alter table public.content_goals enable row level security;
alter table public.template_categories enable row level security;
alter table public.templates enable row level security;
alter table public.template_versions enable row level security;
alter table public.template_services enable row level security;

-- Catalog: read for all authenticated users, write for platform admins.

create policy "verticals: authenticated can read"
  on public.industry_verticals for select to authenticated using (true);
create policy "verticals: platform admin can write"
  on public.industry_verticals for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "services: authenticated can read"
  on public.services for select to authenticated using (true);
create policy "services: platform admin can write"
  on public.services for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "content_goals: authenticated can read"
  on public.content_goals for select to authenticated using (true);
create policy "content_goals: platform admin can write"
  on public.content_goals for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "template_categories: authenticated can read"
  on public.template_categories for select to authenticated using (true);
create policy "template_categories: platform admin can write"
  on public.template_categories for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Templates: normal users see published only; platform admins see all.

create policy "templates: published visible, admins see all"
  on public.templates for select to authenticated
  using (status = 'published' or public.is_platform_admin());

create policy "templates: platform admin can insert"
  on public.templates for insert to authenticated
  with check (public.is_platform_admin());

create policy "templates: platform admin can update"
  on public.templates for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "templates: platform admin can delete"
  on public.templates for delete to authenticated
  using (public.is_platform_admin());

-- Template versions: readable when the parent template is visible;
-- insert by admins only; NO update/delete policies — versions are immutable
-- even for admins (fixes go into a new version).

create policy "template_versions: visible with parent template"
  on public.template_versions for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.templates t
      where t.id = template_id and t.status = 'published'
    )
  );

create policy "template_versions: platform admin can insert"
  on public.template_versions for insert to authenticated
  with check (public.is_platform_admin());

create policy "template_services: authenticated can read"
  on public.template_services for select to authenticated using (true);
create policy "template_services: platform admin can write"
  on public.template_services for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Dental vertical seed (catalog reference data; template content lives in
-- supabase/seed.sql). Keys match the Phase 02 interim config so stored
-- workspace selections remain valid.
-- ---------------------------------------------------------------------------

insert into public.industry_verticals (id, key, label_en, label_ar, is_available, sort_order)
values ('20000000-0000-0000-0000-000000000001', 'dental', 'Dental clinic', 'عيادة أسنان', true, 1)
on conflict (key) do nothing;

insert into public.services (vertical_id, key, label_en, label_ar, sort_order)
values
  ('20000000-0000-0000-0000-000000000001', 'teeth-whitening', 'Teeth whitening', 'تبييض الأسنان', 1),
  ('20000000-0000-0000-0000-000000000001', 'orthodontics', 'Orthodontics & braces', 'تقويم الأسنان', 2),
  ('20000000-0000-0000-0000-000000000001', 'dental-implants', 'Dental implants', 'زراعة الأسنان', 3),
  ('20000000-0000-0000-0000-000000000001', 'veneers', 'Veneers & Hollywood smile', 'الفينير وابتسامة هوليود', 4),
  ('20000000-0000-0000-0000-000000000001', 'cleaning-checkup', 'Cleaning & check-ups', 'تنظيف وفحص دوري', 5),
  ('20000000-0000-0000-0000-000000000001', 'root-canal', 'Root canal treatment', 'علاج العصب', 6),
  ('20000000-0000-0000-0000-000000000001', 'pediatric-dentistry', 'Pediatric dentistry', 'طب أسنان الأطفال', 7),
  ('20000000-0000-0000-0000-000000000001', 'gum-treatment', 'Gum treatment', 'علاج اللثة', 8),
  ('20000000-0000-0000-0000-000000000001', 'dentures', 'Dentures & prosthetics', 'التركيبات والأطقم', 9),
  ('20000000-0000-0000-0000-000000000001', 'cosmetic-dentistry', 'Cosmetic dentistry', 'تجميل الأسنان', 10)
on conflict (vertical_id, key) do nothing;

insert into public.content_goals (vertical_id, key, label_en, label_ar, sort_order)
values
  ('20000000-0000-0000-0000-000000000001', 'service-promotion', 'Promote a service', 'الترويج لخدمة', 1),
  ('20000000-0000-0000-0000-000000000001', 'special-offer', 'Announce a special offer', 'الإعلان عن عرض', 2),
  ('20000000-0000-0000-0000-000000000001', 'education-tip', 'Share an educational tip', 'نصيحة توعوية', 3),
  ('20000000-0000-0000-0000-000000000001', 'booking-reminder', 'Encourage bookings', 'تشجيع الحجوزات', 4),
  ('20000000-0000-0000-0000-000000000001', 'seasonal-greeting', 'Seasonal greeting', 'تهنئة موسمية', 5),
  ('20000000-0000-0000-0000-000000000001', 'brand-awareness', 'Build brand awareness', 'تعزيز الوعي بالعلامة', 6)
on conflict (vertical_id, key) do nothing;

insert into public.template_categories (vertical_id, key, label_en, label_ar, sort_order)
values
  ('20000000-0000-0000-0000-000000000001', 'promotions', 'Promotions & offers', 'العروض والترويج', 1),
  ('20000000-0000-0000-0000-000000000001', 'educational', 'Educational', 'محتوى توعوي', 2),
  ('20000000-0000-0000-0000-000000000001', 'booking', 'Booking & reminders', 'الحجز والتذكير', 3),
  ('20000000-0000-0000-0000-000000000001', 'seasonal', 'Seasonal & greetings', 'مواسم وتهاني', 4),
  ('20000000-0000-0000-0000-000000000001', 'branding', 'Branding', 'الهوية', 5)
on conflict (vertical_id, key) do nothing;
