-- Phase 3 follow-up: ensure required order columns + supporting indexes exist (idempotent)
-- Consolidates prior additive + index migrations that conflicted on version (date) number.

begin;

-- Add missing Phase 3 columns (nullable for legacy rows). Application enforces presence for new rows.
alter table orders add column if not exists file_hash text;
alter table orders add column if not exists shapeways_model_id text;
alter table orders add column if not exists material_id text;
alter table orders add column if not exists selections jsonb;
alter table orders add column if not exists shipping_address jsonb;
alter table orders add column if not exists shipping_zip text;
alter table orders add column if not exists shipping_option_mode text default 'Cheapest';
alter table orders add column if not exists shipping_option_id text;
alter table orders add column if not exists item_subtotal numeric(12,2);
alter table orders add column if not exists surcharge_amount numeric(12,2) default 0;
alter table orders add column if not exists shipping_price numeric(12,2);
alter table orders add column if not exists total_price numeric(12,2);
alter table orders add column if not exists currency text default 'USD';
alter table orders add column if not exists status text default 'pending';
alter table orders add column if not exists vendor_order_id text;
alter table orders add column if not exists vendor_order_raw jsonb;
alter table orders add column if not exists last_vendor_status jsonb;
alter table orders add column if not exists submitted_at timestamptz;
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists cancelled_at timestamptz;

-- Ensure sequence & triggers exist
create sequence if not exists orders_order_seq;

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
    return new;
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

DO $$
BEGIN
  IF NOT EXISTS (select 1 from pg_trigger where tgname = 'trg_generate_order_number') THEN
    create trigger trg_generate_order_number before insert on orders for each row execute function generate_order_number();
  END IF;
END $$;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (select 1 from pg_trigger where tgname = 'trg_orders_updated_at') THEN
    create trigger trg_orders_updated_at before update on orders for each row execute function set_updated_at();
  END IF;
END $$;

-- Indexes (safe idempotent)
create index if not exists idx_orders_vendor_order_id on orders(vendor_order_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_user_created on orders(user_id, created_at desc);

commit;
