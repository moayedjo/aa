-- =============================================================================
-- Phase 09 — Transparent Billing
-- Tables: plans, billing_customers, subscriptions, webhook_events
-- Paddle webhooks are the source of truth: a browser redirect never mutates
-- a subscription. All billing writes happen server-side via the service
-- role (webhook handler / billing actions); users read only.
-- =============================================================================

create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired');

-- ---------------------------------------------------------------------------
-- plans — the public catalog (readable by everyone; admin-managed).
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (char_length(key) between 2 and 40),
  name text not null,
  -- Prices in the smallest currency unit (cents).
  price_month_cents integer not null check (price_month_cents >= 0),
  price_year_cents integer not null check (price_year_cents >= 0),
  currency text not null default 'USD',
  monthly_designs integer not null default 0,
  monthly_image_credits integer not null default 0,
  member_limit integer not null default 1,
  -- Paddle price ids (set per environment); null → checkout not configured.
  paddle_price_id_month text,
  paddle_price_id_year text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- billing_customers — one Paddle customer per workspace.
-- ---------------------------------------------------------------------------

create table public.billing_customers (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  paddle_customer_id text unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger billing_customers_set_updated_at
  before update on public.billing_customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions — one per workspace; reflects Paddle's state.
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  plan_id uuid references public.plans (id),
  paddle_subscription_id text unique,
  status public.subscription_status not null default 'trialing',
  billing_period text not null default 'month' check (billing_period in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- webhook_events — raw Paddle events, processed exactly once.
-- ---------------------------------------------------------------------------

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  -- Paddle's event id — the unique external id that makes processing
  -- idempotent (a duplicate delivery hits this constraint).
  paddle_event_id text not null unique,
  event_type text not null,
  raw jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Wallet allowance from a plan (Phase 08 integration). Sets the monthly
-- allowance and tops the balance up to it (never removes bought credits).
-- ---------------------------------------------------------------------------

create or replace function public.apply_plan_allowance(
  p_workspace_id uuid,
  p_allowance integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  update public.credit_wallets
  set monthly_allowance = p_allowance
  where workspace_id = p_workspace_id;

  select balance into v_balance
  from public.credit_wallets
  where workspace_id = p_workspace_id;

  if found and v_balance < p_allowance then
    perform public.apply_credit_change(
      p_workspace_id, 'adjustment', p_allowance - v_balance, null,
      'Plan allowance top-up', null
    );
  end if;
end;
$$;

revoke all on function public.apply_plan_allowance(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.apply_plan_allowance(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security — public plan catalog; workspace-scoped billing reads.
-- All writes are server-side (service role); webhook_events is never
-- readable by users.
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;

create policy "plans: anyone authenticated can read active plans"
  on public.plans for select to authenticated
  using (is_active or public.is_platform_admin());

create policy "plans: platform admin can write"
  on public.plans for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "billing_customers: members can read"
  on public.billing_customers for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "subscriptions: members can read"
  on public.subscriptions for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

-- webhook_events: no policies at all — service-role only.

-- ---------------------------------------------------------------------------
-- Plan seed (prices adjustable before launch).
-- ---------------------------------------------------------------------------

insert into public.plans
  (key, name, price_month_cents, price_year_cents, monthly_designs,
   monthly_image_credits, member_limit, sort_order)
values
  ('starter', 'Starter', 1900, 19000, 10, 12, 1, 1),
  ('growth',  'Growth',  4900, 49000, 30, 36, 2, 2),
  ('pro',     'Pro',     8900, 89000, 70, 85, 5, 3)
on conflict (key) do nothing;
