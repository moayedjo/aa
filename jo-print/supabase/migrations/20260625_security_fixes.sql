-- ============================================================
-- Security fixes migration for JO-PRINT beta launch
-- Created: 2026-06-25
-- ============================================================

-- ============================================================
-- 1. Fix open RLS policies
-- ============================================================

-- order_items: only allow insert if the order belongs to the inserting user
-- (or the order has no user_id, i.e. guest order placed in same request)
drop policy if exists "Anyone insert order items" on public.order_items;
create policy "Insert order items for own orders" on public.order_items
  for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_id
        and (user_id = auth.uid() or user_id is null)
    )
  );

-- print_files: only allow insert for authenticated user or guest match
drop policy if exists "Anyone upload files" on public.print_files;
create policy "Insert files for own orders" on public.print_files
  for insert
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and exists (
        select 1 from public.orders
        where id = order_id and user_id is null
      )
    )
  );

-- order_status_history: only service role (via RPC/functions) should insert
-- Normal users never insert directly; admins use the admin API
drop policy if exists "Status history insert" on public.order_status_history;
create policy "Status history insert via rpc only" on public.order_status_history
  for insert
  with check (
    exists (
      select 1 from public.orders o
      join public.profiles p on p.id = auth.uid()
      where o.id = order_id
        and p.role in ('admin', 'order_manager', 'production', 'support')
    )
  );

-- ============================================================
-- 2. Add idempotency_key to orders
-- ============================================================
alter table public.orders
  add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_idx
  on public.orders(idempotency_key)
  where idempotency_key is not null;

-- ============================================================
-- 3. Coupons table
-- ============================================================
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10, 3) not null check (discount_value > 0),
  minimum_order  numeric(10, 3) not null default 0,
  maximum_discount numeric(10, 3),          -- cap for percentage discounts
  usage_limit    integer,                    -- null = unlimited
  usage_count    integer not null default 0,
  starts_at      timestamptz,
  expires_at     timestamptz,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- Only admins read/write coupons
create policy "Admins manage coupons" on public.coupons
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Server-side validation API needs to read coupons — handled via service role in the API route

-- Add coupon_id FK to orders so we can track which coupon was applied
alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id),
  add column if not exists discount_amount numeric(10, 3) not null default 0;

-- ============================================================
-- 4. Atomic order creation RPC
-- ============================================================

-- Drop existing version if any to allow clean recreation
drop function if exists create_order_atomic(jsonb);

create or replace function create_order_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id          uuid;
  v_order_number      text;
  v_user_id           uuid;
  v_customer_name     text;
  v_customer_phone    text;
  v_customer_email    text;
  v_delivery_method   text;
  v_delivery_address  text;
  v_subtotal          numeric(10,3);
  v_delivery_fee      numeric(10,3);
  v_discount_amount   numeric(10,3);
  v_total             numeric(10,3);
  v_notes             text;
  v_idempotency_key   text;
  v_coupon_id         uuid;
  v_coupon_code       text;
  v_item              jsonb;
  v_existing_order_id uuid;
begin
  -- Extract scalar fields
  v_user_id          := (payload->>'user_id')::uuid;
  v_customer_name    := payload->>'customer_name';
  v_customer_phone   := payload->>'customer_phone';
  v_customer_email   := payload->>'customer_email';
  v_delivery_method  := payload->>'delivery_method';
  v_delivery_address := payload->>'delivery_address';
  v_subtotal         := (payload->>'subtotal')::numeric;
  v_delivery_fee     := (payload->>'delivery_fee')::numeric;
  v_discount_amount  := coalesce((payload->>'discount_amount')::numeric, 0);
  v_total            := (payload->>'total')::numeric;
  v_notes            := payload->>'notes';
  v_idempotency_key  := payload->>'idempotency_key';
  v_coupon_code      := payload->>'coupon_code';

  -- Validate required scalars
  if v_customer_name is null or trim(v_customer_name) = '' then
    raise exception 'customer_name is required';
  end if;
  if v_customer_phone is null or trim(v_customer_phone) = '' then
    raise exception 'customer_phone is required';
  end if;
  if v_delivery_method not in ('pickup', 'delivery') then
    raise exception 'invalid delivery_method';
  end if;
  if v_delivery_method = 'delivery' and (v_delivery_address is null or trim(v_delivery_address) = '') then
    raise exception 'delivery_address is required for delivery orders';
  end if;
  if not (payload ? 'items') or jsonb_array_length(payload->'items') = 0 then
    raise exception 'items array is required and must not be empty';
  end if;

  -- Idempotency check: return existing order if same key was already used
  if v_idempotency_key is not null then
    select id into v_existing_order_id
    from public.orders
    where idempotency_key = v_idempotency_key
    limit 1;

    if v_existing_order_id is not null then
      return jsonb_build_object(
        'order_id', v_existing_order_id,
        'idempotent', true
      );
    end if;
  end if;

  -- Resolve and validate coupon (lock row to prevent race condition)
  if v_coupon_code is not null then
    select id into v_coupon_id
    from public.coupons
    where code = upper(trim(v_coupon_code))
      and active = true
      and (starts_at  is null or starts_at  <= now())
      and (expires_at is null or expires_at >= now())
      and (usage_limit is null or usage_count < usage_limit)
    for update;  -- row-level lock prevents double usage

    if v_coupon_id is null then
      raise exception 'invalid or expired coupon';
    end if;
  end if;

  -- Generate order number
  v_order_number := 'JP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 8));

  -- Insert order
  insert into public.orders (
    order_number, user_id, customer_name, customer_phone, customer_email,
    delivery_method, delivery_address,
    payment_method, payment_status,
    subtotal, delivery_fee, discount_amount, total,
    coupon_id, notes, idempotency_key,
    status
  ) values (
    v_order_number,
    v_user_id,
    v_customer_name, v_customer_phone, v_customer_email,
    v_delivery_method, v_delivery_address,
    'cash_on_delivery', 'pending',
    v_subtotal, v_delivery_fee, v_discount_amount, v_total,
    v_coupon_id, v_notes, v_idempotency_key,
    'received'
  )
  returning id into v_order_id;

  -- Insert order items
  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    insert into public.order_items (
      order_id, product_id, product_name, quantity, unit_price, options
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      v_item->'options'
    );
  end loop;

  -- Link any print files (optional, identified by file_ids array)
  if payload ? 'file_ids' and jsonb_array_length(payload->'file_ids') > 0 then
    update public.print_files
    set order_id = v_order_id
    where id in (
      select (value::text)::uuid
      from jsonb_array_elements_text(payload->'file_ids')
    )
    and (user_id = v_user_id or (v_user_id is null and order_id is null));
  end if;

  -- Initial status history entry
  insert into public.order_status_history (order_id, status, note)
  values (v_order_id, 'received', 'تم استلام الطلب');

  -- Increment coupon usage atomically
  if v_coupon_id is not null then
    update public.coupons
    set usage_count = usage_count + 1
    where id = v_coupon_id;
  end if;

  return jsonb_build_object(
    'order_id',     v_order_id,
    'order_number', v_order_number,
    'idempotent',   false
  );
end;
$$;

-- Grant execute only to authenticated and anon (guest orders allowed)
-- The function is SECURITY DEFINER so it runs as owner, but we still
-- restrict who can call it.
revoke all on function create_order_atomic(jsonb) from public;
grant execute on function create_order_atomic(jsonb) to authenticated, anon;

-- ============================================================
-- 5. Audit log table for security events
-- ============================================================
create table if not exists public.audit_log (
  id            bigserial primary key,
  event_type    text not null,
  actor_user_id uuid,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  old_values    jsonb,
  new_values    jsonb,
  ip_hash       text,           -- SHA-256 hash of IP, never the raw address
  created_at    timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Admins read audit log" on public.audit_log
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only service role can insert audit entries (no client direct insert)
-- API routes use service role key for audit logging

create index if not exists audit_log_event_type_idx    on public.audit_log(event_type);
create index if not exists audit_log_actor_user_id_idx on public.audit_log(actor_user_id);
create index if not exists audit_log_created_at_idx    on public.audit_log(created_at desc);
