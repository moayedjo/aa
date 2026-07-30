-- =============================================================================
-- Phase 11 — Admin and Product Analytics
-- Table: admin_audit_logs. Plus admin_adjust_credits — the ONLY way to make
-- a manual credit adjustment, which writes the ledger entry AND the audit
-- record in one transaction so an adjustment can never be unaudited.
-- =============================================================================

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  workspace_id uuid references public.workspaces (id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_workspace_idx
  on public.admin_audit_logs (workspace_id, created_at desc);

alter table public.admin_audit_logs enable row level security;

create policy "admin_audit_logs: platform admin can read"
  on public.admin_audit_logs for select to authenticated
  using (public.is_platform_admin());

-- No user insert path — audit rows are written only by security-definer
-- functions (service role).

-- ---------------------------------------------------------------------------
-- Generic audit writer (service-role only).
-- ---------------------------------------------------------------------------

create or replace function public.record_admin_action(
  p_actor uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_workspace_id uuid,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_logs
    (actor_id, action, target_type, target_id, workspace_id, details)
  values
    (p_actor, p_action, p_target_type, p_target_id, p_workspace_id, p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- Audited credit adjustment: ledger entry + audit row, atomically. Any
-- manual credit change flows through here, so "credit adjustments have
-- audit records" is structural, not a convention.
-- ---------------------------------------------------------------------------

create or replace function public.admin_adjust_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_reason text,
  p_actor uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if p_amount = 0 then
    raise exception 'Adjustment amount must be non-zero';
  end if;

  v_new_balance := public.apply_credit_change(
    p_workspace_id, 'adjustment', p_amount, null,
    'Admin adjustment: ' || coalesce(p_reason, ''), p_actor
  );

  insert into public.admin_audit_logs
    (actor_id, action, target_type, target_id, workspace_id, details)
  values
    (p_actor, 'credit_adjustment', 'workspace', p_workspace_id::text,
     p_workspace_id,
     jsonb_build_object('amount', p_amount, 'reason', p_reason,
                        'balance_after', v_new_balance));

  return v_new_balance;
end;
$$;

revoke all on function public.record_admin_action(uuid, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.admin_adjust_credits(uuid, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.record_admin_action(uuid, text, text, text, uuid, jsonb)
  to service_role;
grant execute on function public.admin_adjust_credits(uuid, integer, text, uuid)
  to service_role;
