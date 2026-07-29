-- =============================================================================
-- Phase 08 — Credits and Usage Transparency
-- Tables: credit_wallets, credit_ledger (append-only), usage_counters
-- Core invariant: a wallet balance NEVER changes without a matching ledger
-- entry. Enforced structurally — wallets have no UPDATE policy, and the
-- only writer is the security-definer function apply_credit_change().
-- =============================================================================

create table public.credit_wallets (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  -- Spendable image credits.
  balance integer not null default 0 check (balance >= 0),
  -- Credits granted at each monthly reset (from the plan; Phase 09).
  monthly_allowance integer not null default 12 check (monthly_allowance >= 0),
  -- The 'YYYY-MM' period the current allowance was granted for.
  allowance_period text not null default to_char(now(), 'YYYY-MM'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entry_type text not null
    check (entry_type in ('allowance', 'reservation', 'refund', 'adjustment')),
  -- Signed: reservations negative, refunds/allowances positive.
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  -- Ties spend/refund to the generation that caused it (idempotency).
  reference_generation uuid references public.ai_generations (id) on delete set null,
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index credit_ledger_workspace_idx
  on public.credit_ledger (workspace_id, created_at desc);

-- One reservation and one refund per generation — the ledger-level
-- idempotency guard that makes duplicate charges impossible.
create unique index credit_ledger_generation_type_idx
  on public.credit_ledger (reference_generation, entry_type)
  where reference_generation is not null;

create table public.usage_counters (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  images_generated integer not null default 0,
  images_failed integer not null default 0,
  designs_created integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, period)
);

create trigger credit_wallets_set_updated_at
  before update on public.credit_wallets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Balance integrity: the ONLY way to change a balance.
-- Locks the wallet row, computes balance_after, rejects overspend, writes
-- the ledger entry and the new balance in one transaction.
-- ---------------------------------------------------------------------------

create or replace function public.apply_credit_change(
  p_workspace_id uuid,
  p_entry_type text,
  p_amount integer,
  p_reference_generation uuid,
  p_reason text,
  p_actor uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  select balance into v_balance
  from public.credit_wallets
  where workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'No credit wallet for workspace %', p_workspace_id;
  end if;

  v_new_balance := v_balance + p_amount;
  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_ledger
    (workspace_id, entry_type, amount, balance_after,
     reference_generation, reason, created_by)
  values
    (p_workspace_id, p_entry_type, p_amount, v_new_balance,
     p_reference_generation, p_reason, p_actor);

  update public.credit_wallets
  set balance = v_new_balance
  where workspace_id = p_workspace_id;

  return v_new_balance;
end;
$$;

-- Monthly reset: if the wallet's period is stale, reset the balance to the
-- monthly allowance with a single 'allowance' ledger entry (image credits
-- do not roll over — they are a monthly allowance).
create or replace function public.ensure_wallet_period(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
  v_wallet record;
  v_delta integer;
begin
  select * into v_wallet
  from public.credit_wallets
  where workspace_id = p_workspace_id
  for update;

  if not found or v_wallet.allowance_period = v_period then
    return;
  end if;

  v_delta := v_wallet.monthly_allowance - v_wallet.balance;
  update public.credit_wallets
  set allowance_period = v_period
  where workspace_id = p_workspace_id;

  if v_delta <> 0 then
    perform public.apply_credit_change(
      p_workspace_id, 'allowance', v_delta, null,
      'Monthly allowance reset for ' || v_period, null
    );
  end if;
end;
$$;

-- Usage counters: upsert-and-increment one countable field for a period.
-- Whitelisted field names only — no dynamic column injection.
create or replace function public.increment_usage(
  p_workspace_id uuid,
  p_period text,
  p_field text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_field not in ('images_generated', 'images_failed', 'designs_created') then
    raise exception 'Unknown usage field %', p_field;
  end if;

  insert into public.usage_counters (workspace_id, period)
  values (p_workspace_id, p_period)
  on conflict (workspace_id, period) do nothing;

  execute format(
    'update public.usage_counters set %I = %I + 1, updated_at = now()
     where workspace_id = $1 and period = $2',
    p_field, p_field
  ) using p_workspace_id, p_period;
end;
$$;

-- Provision a wallet (with its opening allowance) for every new workspace.
create or replace function public.handle_new_workspace_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_wallets (workspace_id, balance, monthly_allowance)
  values (new.id, 12, 12)
  on conflict (workspace_id) do nothing;

  insert into public.credit_ledger
    (workspace_id, entry_type, amount, balance_after, reason)
  values
    (new.id, 'allowance', 12, 12, 'Opening monthly allowance');
  return new;
end;
$$;

create trigger on_workspace_created_wallet
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace_wallet();

-- Backfill wallets for workspaces that already exist.
insert into public.credit_wallets (workspace_id, balance, monthly_allowance)
select id, 12, 12 from public.workspaces
on conflict (workspace_id) do nothing;

insert into public.credit_ledger
  (workspace_id, entry_type, amount, balance_after, reason)
select id, 'allowance', 12, 12, 'Opening monthly allowance (backfill)'
from public.workspaces w
where not exists (
  select 1 from public.credit_ledger l where l.workspace_id = w.id
);

-- ---------------------------------------------------------------------------
-- Row Level Security — read-only for members; all writes go through the
-- security-definer functions (called by the audited service role).
-- ---------------------------------------------------------------------------

alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.usage_counters enable row level security;

create policy "credit_wallets: members can read"
  on public.credit_wallets for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "credit_ledger: members can read"
  on public.credit_ledger for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

create policy "usage_counters: members can read"
  on public.usage_counters for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or public.is_platform_admin()
  );

-- No insert/update/delete policies on any of the three tables: balances and
-- the ledger change only through apply_credit_change / ensure_wallet_period,
-- invoked server-side via the service role.

-- ---------------------------------------------------------------------------
-- Lock down the security-definer functions. They bypass RLS, so they must
-- NOT be callable by end users — only by the service role (server actions)
-- and by the triggers that reference them. Without this, any authenticated
-- user could mint themselves credits by calling the RPC directly.
-- ---------------------------------------------------------------------------

revoke all on function public.apply_credit_change(uuid, text, integer, uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.ensure_wallet_period(uuid)
  from public, anon, authenticated;
revoke all on function public.increment_usage(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_credit_change(uuid, text, integer, uuid, text, uuid)
  to service_role;
grant execute on function public.ensure_wallet_period(uuid) to service_role;
grant execute on function public.increment_usage(uuid, text, text) to service_role;
