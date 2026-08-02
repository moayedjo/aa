-- =============================================================================
-- Phase 02 — Activation Onboarding and Brand Kit
-- Tables: brand_kits, workspace_industry_settings
-- Storage: private `brand-assets` bucket for workspace logos
-- Editing the Brand Kit requires workspace owner/admin; members can read.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- brand_kits — one per workspace
-- ---------------------------------------------------------------------------

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,

  business_name text check (business_name is null or char_length(business_name) between 2 and 120),
  logo_path text,

  primary_color text check (primary_color is null or primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~* '^#[0-9a-f]{6}$'),
  accent_color text check (accent_color is null or accent_color ~* '^#[0-9a-f]{6}$'),
  background_color text check (background_color is null or background_color ~* '^#[0-9a-f]{6}$'),
  text_color text check (text_color is null or text_color ~* '^#[0-9a-f]{6}$'),

  arabic_font text,
  english_font text,

  phone text check (phone is null or char_length(phone) <= 30),
  website text check (website is null or char_length(website) <= 200),
  address text check (address is null or char_length(address) <= 300),

  default_language text not null default 'en' check (default_language in ('ar', 'en')),

  -- Onboarding progress: highest completed step (0-based), and completion mark.
  onboarding_step integer not null default 0 check (onboarding_step between 0 and 20),
  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brand_kits is
  'Workspace brand identity gathered during onboarding. logo_path points into the brand-assets bucket.';

create trigger brand_kits_set_updated_at
  before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workspace_industry_settings — selected vertical + services
-- Service definitions move to database-backed structures in Phase 03; until
-- then keys reference the typed config in src/lib/industries/config.ts.
-- ---------------------------------------------------------------------------

create table public.workspace_industry_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  industry_key text not null default 'dental' check (char_length(industry_key) between 2 and 40),
  selected_services text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspace_industry_settings_set_updated_at
  before update on public.workspace_industry_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.brand_kits enable row level security;
alter table public.workspace_industry_settings enable row level security;

-- brand_kits ---------------------------------------------------------------

create policy "brand_kits: members and platform admins can read"
  on public.brand_kits for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "brand_kits: owner or admin can create"
  on public.brand_kits for insert
  to authenticated
  with check (public.my_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "brand_kits: owner or admin can update"
  on public.brand_kits for update
  to authenticated
  using (public.my_workspace_role(workspace_id) in ('owner', 'admin'))
  with check (public.my_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "brand_kits: only owner can delete"
  on public.brand_kits for delete
  to authenticated
  using (public.my_workspace_role(workspace_id) = 'owner');

-- workspace_industry_settings ----------------------------------------------

create policy "industry_settings: members and platform admins can read"
  on public.workspace_industry_settings for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "industry_settings: owner or admin can create"
  on public.workspace_industry_settings for insert
  to authenticated
  with check (public.my_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "industry_settings: owner or admin can update"
  on public.workspace_industry_settings for update
  to authenticated
  using (public.my_workspace_role(workspace_id) in ('owner', 'admin'))
  with check (public.my_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "industry_settings: only owner can delete"
  on public.workspace_industry_settings for delete
  to authenticated
  using (public.my_workspace_role(workspace_id) = 'owner');

-- ---------------------------------------------------------------------------
-- Storage: private brand-assets bucket
-- Object paths follow `{workspace_id}/...`; policies derive the workspace
-- from the first path segment. 2 MB limit, images only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do nothing;

create policy "brand-assets: workspace members can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "brand-assets: workspace owner/admin can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-assets'
    and public.my_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );

create policy "brand-assets: workspace owner/admin can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.my_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  )
  with check (
    bucket_id = 'brand-assets'
    and public.my_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );

create policy "brand-assets: workspace owner/admin can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.my_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );
