-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  address text,
  role text not null default 'customer' check (role in ('customer','admin','order_manager','production','support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products table
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_en text,
  category text not null,
  price numeric(10,3) not null,
  price_unit text not null default 'لكل قطعة',
  description text,
  icon text,
  color text,
  popular boolean default false,
  options jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz not null default now()
);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  user_id uuid references public.profiles(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_method text not null default 'pickup' check (delivery_method in ('pickup','delivery')),
  delivery_address text,
  payment_method text not null default 'cash' check (payment_method in ('cash','card')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  status text not null default 'received' check (status in ('received','reviewing','approved','production','ready','delivered','cancelled')),
  subtotal numeric(10,3) not null,
  delivery_fee numeric(10,3) not null default 0,
  total numeric(10,3) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id text not null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(10,3) not null,
  options jsonb,
  created_at timestamptz not null default now()
);

-- Print files table
create table if not exists public.print_files (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id),
  file_name text not null,
  file_path text not null,
  file_size integer,
  file_type text,
  print_options jsonb,
  status text not null default 'uploaded' check (status in ('uploaded','reviewing','approved','rejected')),
  notes text,
  created_at timestamptz not null default now()
);

-- Order status history
create table if not exists public.order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  status text not null,
  note text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Books
create table if not exists public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subject text not null,
  grade text not null,
  price numeric(10,3) not null,
  pages integer,
  description text,
  active boolean default true,
  created_at timestamptz not null default now()
);

-- Teachers
create table if not exists public.teachers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subjects text[] not null,
  experience integer not null,
  rating numeric(3,1) default 5.0,
  rate_per_hour numeric(10,3) not null,
  location text not null,
  available boolean default true,
  bio text,
  created_at timestamptz not null default now()
);

-- Print shops
create table if not exists public.print_shops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  area text not null,
  phone text not null,
  hours text,
  rating numeric(3,1) default 5.0,
  services text[],
  active boolean default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.print_files enable row level security;
alter table public.order_status_history enable row level security;
alter table public.products enable row level security;
alter table public.books enable row level security;
alter table public.teachers enable row level security;
alter table public.print_shops enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins all profiles" on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','order_manager'))
);
create policy "Users view own orders" on public.orders for select using (user_id = auth.uid());
create policy "Anyone insert orders" on public.orders for insert with check (
  customer_name is not null and customer_phone is not null and total > 0
);
create policy "Admins all orders" on public.orders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','order_manager','production'))
);
create policy "Order items select" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Anyone insert order items" on public.order_items for insert with check (true);
create policy "Admins all order items" on public.order_items for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','order_manager'))
);
create policy "Users view own files" on public.print_files for select using (user_id = auth.uid());
create policy "Anyone upload files" on public.print_files for insert with check (true);
create policy "Admins all files" on public.print_files for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','order_manager','production'))
);
create policy "Status history select" on public.order_status_history for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Status history insert" on public.order_status_history for insert with check (true);
create policy "Public read products" on public.products for select using (active = true);
create policy "Admins manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Public read books" on public.books for select using (active = true);
create policy "Admins manage books" on public.books for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Public read teachers" on public.teachers for select using (available = true);
create policy "Admins manage teachers" on public.teachers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Public read shops" on public.print_shops for select using (active = true);
create policy "Admins manage shops" on public.print_shops for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Log status changes
create or replace function public.log_order_status_change()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create or replace trigger on_order_status_change
  after update on public.orders
  for each row execute procedure public.log_order_status_change();

-- Notifications log table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  type text not null,
  phone text not null,
  message text not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Admins can manage notifications"
  on public.notifications for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','order_manager')
    )
  );

create policy "Service can insert notifications"
  on public.notifications for insert
  with check (true);

-- Rate limiting table
create table if not exists public.rate_limit_events (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_key_created_at on public.rate_limit_events(key, created_at);
alter table public.rate_limit_events enable row level security;
create policy "No public access to rate_limit_events"
  on public.rate_limit_events for all
  using (false);

-- Performance indexes
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists print_files_user_id_idx on public.print_files(user_id);
create index if not exists print_files_order_id_idx on public.print_files(order_id);

-- Teacher bookings (personal data stored server-side, not exposed in WhatsApp URLs)
create table if not exists public.teacher_bookings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  teacher_name text not null,
  customer_name text not null,
  customer_phone text not null,
  subject text,
  preferred_time text,
  notes text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.teacher_bookings enable row level security;
create policy "Admins manage teacher_bookings" on public.teacher_bookings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','support'))
);
create policy "Service insert teacher_bookings" on public.teacher_bookings for insert with check (true);
create index if not exists teacher_bookings_teacher_id_idx on public.teacher_bookings(teacher_id);

-- Auto-cleanup rate_limit_events older than 1 hour to prevent unbounded growth
create or replace function public.cleanup_rate_limit_events()
returns void language plpgsql security definer as $$
begin
  delete from public.rate_limit_events where created_at < now() - interval '1 hour';
end;
$$;
