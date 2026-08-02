-- =============================================================================
-- Phase 01 — Auth, Workspaces and Security
-- Tables: profiles, user_roles, workspaces, workspace_members
-- All tables are RLS-enabled with default-deny; policies below are the only
-- access paths for authenticated users. Platform-admin status lives in
-- user_roles (server-managed), never in profile fields or client metadata.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.platform_role as enum ('platform_admin', 'user');

create type public.workspace_role as enum ('owner', 'admin', 'editor', 'viewer');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Created by trigger on auth.users; no client insert.';

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.platform_role not null default 'user',
  created_at timestamptz not null default now()
);

comment on table public.user_roles is
  'Platform-level role. Only the service role can grant platform_admin.';

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'editor',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- security definer so policies can consult membership tables without
-- recursing into their own RLS. search_path pinned to prevent hijacking.
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and role = 'platform_admin'
  );
$$;

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.my_workspace_role(ws_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = ws_id
    and user_id = (select auth.uid());
$$;

create or replace function public.shares_workspace_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on mine.workspace_id = theirs.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Provision profile + default platform role for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically make the creator the owner of a new workspace.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- Keep updated_at accurate.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- profiles ------------------------------------------------------------------

create policy "profiles: read own or workspace peers or platform admin"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.shares_workspace_with(id)
    or public.is_platform_admin()
  );

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies: rows are managed by the auth.users trigger.

-- user_roles ----------------------------------------------------------------

create policy "user_roles: read own or platform admin"
  on public.user_roles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin()
  );

-- No insert/update/delete policies: platform roles change only via the
-- service role (server-side, audited in a later phase).

-- workspaces ----------------------------------------------------------------

create policy "workspaces: members and platform admins can read"
  on public.workspaces for select
  to authenticated
  using (
    public.is_workspace_member(id)
    or public.is_platform_admin()
  );

create policy "workspaces: any authenticated user can create as themselves"
  on public.workspaces for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "workspaces: owner or admin can update"
  on public.workspaces for update
  to authenticated
  using (public.my_workspace_role(id) in ('owner', 'admin'))
  with check (public.my_workspace_role(id) in ('owner', 'admin'));

create policy "workspaces: only owner can delete"
  on public.workspaces for delete
  to authenticated
  using (public.my_workspace_role(id) = 'owner');

-- workspace_members ---------------------------------------------------------

create policy "workspace_members: members and platform admins can read"
  on public.workspace_members for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "workspace_members: owner or admin can add members"
  on public.workspace_members for insert
  to authenticated
  with check (
    public.my_workspace_role(workspace_id) in ('owner', 'admin')
    -- Only an owner may grant the owner role.
    and (role <> 'owner' or public.my_workspace_role(workspace_id) = 'owner')
  );

create policy "workspace_members: owner or admin can change roles"
  on public.workspace_members for update
  to authenticated
  using (
    public.my_workspace_role(workspace_id) in ('owner', 'admin')
    -- Admins cannot touch the owner's membership row.
    and (role <> 'owner' or public.my_workspace_role(workspace_id) = 'owner')
  )
  with check (
    public.my_workspace_role(workspace_id) in ('owner', 'admin')
    and (role <> 'owner' or public.my_workspace_role(workspace_id) = 'owner')
  );

create policy "workspace_members: owner/admin can remove, members can leave"
  on public.workspace_members for delete
  to authenticated
  using (
    (
      public.my_workspace_role(workspace_id) in ('owner', 'admin')
      and (role <> 'owner' or public.my_workspace_role(workspace_id) = 'owner')
    )
    -- Any member may remove their own membership, except the owner
    -- (ownership transfer is a later-phase feature).
    or (user_id = (select auth.uid()) and role <> 'owner')
  );
