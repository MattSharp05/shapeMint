-- Restore / ensure Shapeways quoting objects (tables, trigger, policies, view)
-- Safe / idempotent: uses IF EXISTS / IF NOT EXISTS and duplicate_object handlers
-- Timestamp: 2025-08-22 01:05 UTC

BEGIN;

-- Recreate tables if they were dropped (structure matches original design)
CREATE TABLE IF NOT EXISTS public.quotes (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	vendor text NOT NULL CHECK (vendor = 'shapeways'),
	model_url text NOT NULL,
	file_hash text NOT NULL,
	shapeways_model_id text,
	material_id text NOT NULL,
	selections jsonb NOT NULL,
	quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 100),
	shipping_address jsonb NOT NULL,
	shipping_zip text,
	shapeways jsonb,
	price_total numeric(12,2),
	currency text NOT NULL DEFAULT 'USD',
	status text NOT NULL DEFAULT 'pending' CHECK (status IN ('quoted','failed','pending')),
	expires_at timestamptz,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sw_models_cache (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	file_hash text UNIQUE NOT NULL,
	shapeways_model_id text NOT NULL,
	created_at timestamptz DEFAULT now()
);

-- Function & trigger (recreate safely)
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_update_quotes_updated_at ON public.quotes;
CREATE TRIGGER trg_update_quotes_updated_at BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();

-- Indexes (IF NOT EXISTS guards)
CREATE INDEX IF NOT EXISTS quotes_user_created_idx ON public.quotes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_file_hash_idx ON public.quotes (file_hash);
CREATE INDEX IF NOT EXISTS quotes_material_idx ON public.quotes (material_id);
CREATE INDEX IF NOT EXISTS quotes_expires_idx ON public.quotes (expires_at);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON public.quotes (status);
CREATE INDEX IF NOT EXISTS quotes_shipping_zip_idx ON public.quotes (shipping_zip);

-- Ensure RLS enabled
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sw_models_cache ENABLE ROW LEVEL SECURITY;

-- Policies (ignore duplicates)
DO $$ BEGIN
	CREATE POLICY quotes_select_own ON public.quotes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
	CREATE POLICY quotes_insert_own ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
	CREATE POLICY quotes_service_all ON public.quotes USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
	CREATE POLICY sw_models_cache_service_all ON public.sw_models_cache USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (Re)create view
DROP VIEW IF EXISTS public.quote_summary;
CREATE VIEW public.quote_summary AS
SELECT 
	q.id,
	q.user_id,
	q.vendor,
	q.model_url,
	q.material_id,
	q.quantity,
	q.price_total,
	q.currency,
	q.status,
	q.shipping_zip,
	q.shipping_address->>'firstName' AS first_name,
	q.shipping_address->>'lastName' AS last_name,
	q.shipping_address->>'phone' AS phone,
	q.created_at,
	q.expires_at
FROM public.quotes q
ORDER BY q.created_at DESC;

COMMIT;