-- =============================================================================
-- Phase 10 — Guided Experience and Support
-- Tables: support_requests, design_ratings, product_events
-- (admin_audit_logs stays Phase 11.)
-- =============================================================================

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  design_id uuid references public.design_projects (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'problem' check (kind in ('problem', 'feedback', 'help')),
  message text not null check (char_length(message) between 3 and 4000),
  -- Design + workspace context captured at submission time (spec §10).
  context jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index support_requests_workspace_idx
  on public.support_requests (workspace_id, created_at desc);

create table public.design_ratings (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.design_projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One rating per user per design (upsert to change it).
  unique (design_id, user_id)
);

create trigger design_ratings_set_updated_at
  before update on public.design_ratings
  for each row execute function public.set_updated_at();

-- Funnel + product analytics. Written server-side (service role) by the
-- analytics transport; readable by platform admins only (Phase 11 KPIs).
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index product_events_type_idx
  on public.product_events (event_type, created_at desc);
create index product_events_workspace_idx
  on public.product_events (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.support_requests enable row level security;
alter table public.design_ratings enable row level security;
alter table public.product_events enable row level security;

-- support_requests: any member may open one; the creator and workspace
-- owner/admin (and platform admin) can read; nobody edits from the client
-- (status changes are handled server-side / admin in Phase 11).

create policy "support_requests: creator/owner-admin/platform can read"
  on public.support_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.my_workspace_role(workspace_id) in ('owner', 'admin')
    or public.is_platform_admin()
  );

create policy "support_requests: members can create their own"
  on public.support_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

-- design_ratings: members read their workspace's; a member rates as
-- themselves and can update their own rating.

create policy "design_ratings: members can read"
  on public.design_ratings for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "design_ratings: members can create their own"
  on public.design_ratings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

create policy "design_ratings: users can update their own"
  on public.design_ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- product_events: platform-admin read only; inserts are service-role
-- (which bypasses RLS), so no insert policy is needed.

create policy "product_events: platform admin can read"
  on public.product_events for select to authenticated
  using (public.is_platform_admin());
