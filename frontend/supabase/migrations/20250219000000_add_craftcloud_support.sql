-- Migration: Add Craftcloud vendor support
-- Fixes: orders table constraints blocking Craftcloud order inserts
-- 1. Adds 'craftcloud' to vendor CHECK constraint
-- 2. Adds 'pending_payment' to status CHECK constraint
-- 3. Makes model_url nullable (Craftcloud orders don't have a direct model_url)

BEGIN;

-- 1. Update vendor CHECK to include craftcloud
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_vendor_check;
ALTER TABLE orders ADD CONSTRAINT orders_vendor_check
  CHECK (vendor IN ('shapeways', 'slant3d', 'treatstock', 'craftcloud'));

-- 2. Update status CHECK to include pending_payment
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- Drop the inline check constraint name (Postgres auto-names it)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%pending%submitted%'
  LOOP
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_payment', 'submitted', 'in_production', 'shipped', 'delivered', 'failed', 'cancelled'));

-- 3. Make model_url nullable (Craftcloud doesn't use it)
ALTER TABLE orders ALTER COLUMN model_url DROP NOT NULL;

-- 4. Update order number generation to support Craftcloud prefix
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS trigger AS $$
DECLARE
  seq_val bigint;
  digits text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  n bigint;
  r int;
  rev text := '';
  prefix text;
BEGIN
  IF new.order_number IS NOT NULL THEN
    RETURN new;
  END IF;

  CASE new.vendor
    WHEN 'shapeways' THEN prefix := 'SHPW';
    WHEN 'slant3d' THEN prefix := 'SLNT';
    WHEN 'treatstock' THEN prefix := 'TRTS';
    WHEN 'craftcloud' THEN prefix := 'CRFT';
    ELSE prefix := 'ORDR';
  END CASE;

  seq_val := nextval('orders_order_seq');
  n := seq_val;
  IF n = 0 THEN
    rev := '0';
  ELSE
    WHILE n > 0 LOOP
      r := (n % 36)::int;
      rev := substr(digits, r+1, 1) || rev;
      n := n / 36;
    END LOOP;
  END IF;
  WHILE length(rev) < 6 LOOP
    rev := '0' || rev;
  END LOOP;
  new.order_number := prefix || rev;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

COMMIT;
