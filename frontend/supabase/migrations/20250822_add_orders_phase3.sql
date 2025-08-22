-- Phase 3: Orders core schema
-- Creates orders and order_events tables for Shapeways vendor ordering
-- Order number format: base36 sequence padded to 6 chars with SHPW prefix (e.g., SHPW00000A)

begin;

-- Sequence for order number numeric component
create sequence if not exists orders_order_seq;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor text not null check (vendor in ('shapeways')),
  order_number text not null unique,
  quote_id uuid references quotes(id) on delete set null,
  model_url text not null,
  file_hash text,
  shapeways_model_id text,
  material_id text not null,
  selections jsonb not null,
  quantity int not null check (quantity > 0 and quantity <= 100),
  shipping_address jsonb not null,
  shipping_zip text not null,
  shipping_option_mode text not null default 'Cheapest', -- always cheapest at order time for now
  shipping_option_id text, -- shapeways shipping option id actually used
  item_subtotal numeric(12,2) not null,
  surcharge_amount numeric(12,2) not null default 0,
  shipping_price numeric(12,2) not null,
  total_price numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','submitted','in_production','shipped','delivered','failed','cancelled')),
  vendor_order_id text, -- Shapeways order id
  vendor_order_raw jsonb, -- raw response from create order
  last_vendor_status jsonb, -- last status payload from vendor get-order
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists order_events (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evt_type text not null,
  evt_data jsonb,
  created_at timestamptz not null default now()
);

-- Trigger to set order_number on insert using base36 padded with prefix
create or replace function generate_order_number()
returns trigger as $$
declare
  seq_val bigint;
  digits text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  n bigint;
  r int;
  rev text := '';
begin
  if new.order_number is not null then
    return new; -- allow manual override (testing)
  end if;
  seq_val := nextval('orders_order_seq');
  n := seq_val;
  if n = 0 then
    rev := '0';
  else
    while n > 0 loop
      r := (n % 36)::int;
      rev := substr(digits, r+1, 1) || rev;
      n := n / 36;
    end loop;
  end if;
  while length(rev) < 6 loop
    rev := '0' || rev;
  end loop;
  new.order_number := 'SHPW' || rev;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_order_number on orders;
create trigger trg_generate_order_number
before insert on orders
for each row execute function generate_order_number();

-- Updated timestamp trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();

-- Indexes
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_vendor_order_id on orders(vendor_order_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_events_order_id on order_events(order_id);

-- RLS
alter table orders enable row level security;
alter table order_events enable row level security;

DO $$ BEGIN
  CREATE POLICY orders_owner_select ON orders FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY orders_owner_insert ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY orders_owner_update ON orders FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY orders_owner_delete ON orders FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY order_events_owner_select ON order_events FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY order_events_owner_insert ON order_events FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

commit;
