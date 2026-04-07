-- Admin helpers for the admin dashboard.
-- TODO: Replace with proper role-based admin policies later.

-- Function to expose user emails from auth.users (not directly queryable from client).
-- Uses SECURITY DEFINER to read auth.users on behalf of the caller.
CREATE OR REPLACE FUNCTION public.admin_get_user_emails()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email::text FROM auth.users;
$$;

-- Orders: allow any authenticated user to read all orders
-- (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read all orders' AND tablename = 'orders'
  ) THEN
    CREATE POLICY "Authenticated users can read all orders"
      ON public.orders
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END
$$;
