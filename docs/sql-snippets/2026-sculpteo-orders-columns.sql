-- Sculpteo vendor columns on public.orders.
-- Mirrors the slant_order_id / slant_response pattern so downstream admin UI
-- and reporting can treat Sculpteo orders symmetrically. Paste into the
-- Supabase SQL editor; safe to re-run (idempotent).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sculpteo_order_id text,
  ADD COLUMN IF NOT EXISTS sculpteo_response jsonb;

-- Unique constraint on the vendor-issued order id (allows NULLs).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_sculpteo_order_id_key'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_sculpteo_order_id_key UNIQUE (sculpteo_order_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_sculpteo_order_id
  ON public.orders USING btree (sculpteo_order_id);

-- Let Supabase generated types pick up the columns on next regeneration.
COMMENT ON COLUMN public.orders.sculpteo_order_id IS
  'Sculpteo-issued order id (returned by POST /api/order/). Populated by vendor-sculpteo-submit-order once payment clears.';
COMMENT ON COLUMN public.orders.sculpteo_response IS
  'Raw JSON response from Sculpteo at order submission time. Used for debugging + reconciliation.';
