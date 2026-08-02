-- =============================================================================
-- Phase 04 — First Design Flow and Editor Foundation
-- Tables: design_projects, design_assets
-- Storage: private `design-assets` bucket for uploaded design images
-- (design_versions and design_exports arrive with Phase 05.)
-- =============================================================================

create table public.design_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Immutable template reference: template_id + template_version pin the
  -- exact snapshot this design was created from.
  template_id uuid not null references public.templates (id),
  template_version integer not null check (template_version >= 1),
  name text not null check (char_length(name) between 1 and 140),
  language text not null default 'en' check (language in ('ar', 'en')),
  -- Working state; validated against src/lib/designs/schema.ts on save.
  design_json jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index design_projects_workspace_idx on public.design_projects (workspace_id);

create trigger design_projects_set_updated_at
  before update on public.design_projects
  for each row execute function public.set_updated_at();

create table public.design_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  design_id uuid references public.design_projects (id) on delete set null,
  storage_path text not null,
  kind text not null default 'upload' check (kind in ('upload')),
  mime_type text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index design_assets_workspace_idx on public.design_assets (workspace_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Designs: workspace members read; owner/admin/editor write (viewers are
-- read-only per the permission model).
-- ---------------------------------------------------------------------------

alter table public.design_projects enable row level security;
alter table public.design_assets enable row level security;

create policy "design_projects: members can read"
  on public.design_projects for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "design_projects: editors can create"
  on public.design_projects for insert
  to authenticated
  with check (
    public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
    and created_by = (select auth.uid())
  );

create policy "design_projects: editors can update"
  on public.design_projects for update
  to authenticated
  using (public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor'))
  with check (public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor'));

create policy "design_projects: owner or admin can delete"
  on public.design_projects for delete
  to authenticated
  using (public.my_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "design_assets: members can read"
  on public.design_assets for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "design_assets: editors can create"
  on public.design_assets for insert
  to authenticated
  with check (
    public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
    and created_by = (select auth.uid())
  );

create policy "design_assets: owner or admin can delete"
  on public.design_assets for delete
  to authenticated
  using (public.my_workspace_role(workspace_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- Storage: private design-assets bucket
-- Paths follow `{workspace_id}/{design_id}/...`; 5 MB, images only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-assets',
  'design-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "design-assets: workspace members can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'design-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "design-assets: editors can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'design-assets'
    and public.my_workspace_role(((storage.foldername(name))[1])::uuid)
        in ('owner', 'admin', 'editor')
  );

create policy "design-assets: owner/admin can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'design-assets'
    and public.my_workspace_role(((storage.foldername(name))[1])::uuid)
        in ('owner', 'admin')
  );
