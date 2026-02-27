-- Migration: Add Treatstock vendor support
-- Created at 2025-01-27
-- Adds Treatstock to vendor enum, creates cache table, and updates order number generation

BEGIN;

-- Update orders table to allow 'treatstock' vendor
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_vendor_check;
ALTER TABLE orders ADD CONSTRAINT orders_vendor_check CHECK (vendor IN ('shapeways', 'slant3d', 'treatstock'));

-- Create treatstock_packs_cache table for caching printable pack IDs
CREATE TABLE IF NOT EXISTS public.treatstock_packs_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash text UNIQUE NOT NULL,
  printable_pack_id integer NOT NULL,
  part_uid text,
  created_at timestamptz DEFAULT now()
);

-- Index for file hash lookups
CREATE INDEX IF NOT EXISTS treatstock_packs_cache_file_hash_idx ON public.treatstock_packs_cache(file_hash);

-- Index for printable pack ID lookups
CREATE INDEX IF NOT EXISTS treatstock_packs_cache_pack_id_idx ON public.treatstock_packs_cache(printable_pack_id);

-- Update order number generation function to support Treatstock
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
    RETURN new; -- allow manual override (testing)
  END IF;
  
  -- Set prefix based on vendor
  CASE new.vendor
    WHEN 'shapeways' THEN prefix := 'SHPW';
    WHEN 'slant3d' THEN prefix := 'SLNT';
    WHEN 'treatstock' THEN prefix := 'TRTS';
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

-- Update orders table to allow nullable material_id (Treatstock uses materialGroup/color instead)
-- Note: This is a soft change - existing orders will still have material_id
ALTER TABLE orders ALTER COLUMN material_id DROP NOT NULL;

-- Add file_url column if it doesn't exist (for legacy compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'file_url') THEN
    ALTER TABLE orders ADD COLUMN file_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'filename') THEN
    ALTER TABLE orders ADD COLUMN filename text;
  END IF;
END $$;

COMMIT;
