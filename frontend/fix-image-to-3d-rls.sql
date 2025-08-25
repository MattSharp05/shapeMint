-- Fix RLS policies for service role to update generated_models
-- This allows the Edge function to update model status when complete

-- Add UPDATE policy for service role
CREATE POLICY "Service role can update generated_models" ON "public"."generated_models"
AS PERMISSIVE FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Add SELECT policy for service role (if not exists)
CREATE POLICY "Service role can select generated_models" ON "public"."generated_models"
AS PERMISSIVE FOR SELECT
TO service_role
USING (true);

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'generated_models' 
AND roles::text LIKE '%service_role%';
