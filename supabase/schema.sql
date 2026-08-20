create extension if not exists pgcrypto;

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_balance numeric(12,2) not null default 0,
  total_cash_sales numeric(12,2) not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.cash_sessions(id) on delete cascade,
  movement_type text not null check (movement_type in ('opening', 'supply', 'withdrawal', 'closing')),
  amount numeric(12,2) not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text unique not null,
  sku text unique not null,
  category text not null,
  price numeric(12,2) not null,
  cost numeric(12,2) not null,
  stock integer not null default 0,
  min_stock integer not null default 0,
  unit text not null default 'un',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  session_id uuid references public.cash_sessions(id) on delete set null,
  total numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('pix', 'card', 'credit', 'debit', 'cash', 'voucher', 'split')),
  paid_amount numeric(12,2) not null default 0,
  change numeric(12,2) not null default 0,
  cashier text not null,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
  status text not null default 'completed' check (status in ('completed', 'canceled')),
  canceled_at timestamptz,
  canceled_by text,
  cancel_reason text,
  created_at timestamptz not null default now()
);

-- Migracao idempotente para bancos criados antes do cancelamento de venda existir.
alter table public.sales drop constraint if exists sales_payment_method_check;
alter table public.sales add constraint sales_payment_method_check check (payment_method in ('pix', 'card', 'credit', 'debit', 'cash', 'voucher', 'split'));
alter table public.sales add column if not exists status text not null default 'completed' check (status in ('completed', 'canceled'));
alter table public.sales add column if not exists canceled_at timestamptz;
alter table public.sales add column if not exists canceled_by text;
alter table public.sales add column if not exists cancel_reason text;
alter table public.sales add column if not exists customer_name text;
alter table public.sales add column if not exists customer_cpf text;
alter table public.sales add column if not exists customer_phone text;

alter table public.sales add column if not exists payments_data jsonb;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf_cnpj text,
  phone text,
  email text,
  loyalty_points integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parked_sales (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null,
  cart_data jsonb not null default '[]'::jsonb,
  customer_discount numeric(12,2) not null default 0,
  customer_data jsonb,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.parked_sales enable row level security;

drop policy if exists "authenticated users can manage customers" on public.customers;
create policy "authenticated users can manage customers" on public.customers
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated users can manage parked sales" on public.parked_sales;
create policy "authenticated users can manage parked sales" on public.parked_sales
  for all to authenticated using (true) with check (true);


create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'operator' check (role in ('operator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'operator')
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated users can read products" on public.products;
create policy "authenticated users can read products" on public.products
  for select to authenticated using (true);

drop policy if exists "authenticated users can manage products" on public.products;
create policy "authenticated users can manage products" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated users can read sales" on public.sales;
create policy "authenticated users can read sales" on public.sales
  for select to authenticated using (true);

drop policy if exists "authenticated users can manage sales" on public.sales;
create policy "authenticated users can manage sales" on public.sales
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated users can read sale items" on public.sale_items;
create policy "authenticated users can read sale items" on public.sale_items
  for select to authenticated using (true);

drop policy if exists "authenticated users can manage sale items" on public.sale_items;
create policy "authenticated users can manage sale items" on public.sale_items
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated users can read cash sessions" on public.cash_sessions;
create policy "authenticated users can read cash sessions" on public.cash_sessions
  for select to authenticated using (true);

drop policy if exists "authenticated users can manage cash sessions" on public.cash_sessions;
create policy "authenticated users can manage cash sessions" on public.cash_sessions
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated users can read cash movements" on public.cash_movements;
create policy "authenticated users can read cash movements" on public.cash_movements
  for select to authenticated using (true);

drop policy if exists "authenticated users can manage cash movements" on public.cash_movements;
create policy "authenticated users can manage cash movements" on public.cash_movements
  for all to authenticated using (true) with check (true);

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

