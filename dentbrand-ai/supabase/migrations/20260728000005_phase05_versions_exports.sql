-- =============================================================================
-- Phase 05 — Autosave, Recovery and Export
-- Tables: design_versions, design_exports; soft delete on design_projects.
-- Versions are immutable snapshots (no update/delete policies).
-- =============================================================================

-- Soft delete / trash.
alter table public.design_projects
  add column deleted_at timestamptz;

create index design_projects_deleted_idx
  on public.design_projects (workspace_id, deleted_at);

-- ---------------------------------------------------------------------------
-- design_versions — restorable snapshots of a design's working state
-- ---------------------------------------------------------------------------

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.design_projects (id) on delete cascade,
  version integer not null check (version >= 1),
  kind text not null default 'checkpoint'
    check (kind in ('checkpoint', 'manual', 'pre-restore')),
  design_json jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (design_id, version)
);

create index design_versions_design_idx on public.design_versions (design_id);

-- ---------------------------------------------------------------------------
-- design_exports — record of export attempts (quality metrics need failures)
-- ---------------------------------------------------------------------------

create table public.design_exports (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.design_projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  format text not null default 'png' check (format in ('png')),
  width integer not null,
  height integer not null,
  status text not null check (status in ('completed', 'failed')),
  error text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index design_exports_workspace_idx on public.design_exports (workspace_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.design_versions enable row level security;
alter table public.design_exports enable row level security;

create policy "design_versions: members can read"
  on public.design_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.design_projects dp
      where dp.id = design_id
        and (public.is_workspace_member(dp.workspace_id)
             or public.is_platform_admin())
    )
  );

create policy "design_versions: editors can create"
  on public.design_versions for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.design_projects dp
      where dp.id = design_id
        and public.my_workspace_role(dp.workspace_id) in ('owner', 'admin', 'editor')
    )
  );

-- No update/delete policies: versions are immutable history.

create policy "design_exports: members can read"
  on public.design_exports for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "design_exports: editors can create"
  on public.design_exports for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and public.my_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
  );
