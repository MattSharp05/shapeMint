-- Fix RLS policy for stripe_sessions table
-- Add INSERT policy for service role to allow Edge functions to insert data

-- Add INSERT policy for service role
CREATE POLICY "Service role can insert stripe sessions" 
ON "public"."stripe_sessions" 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Verify the policies
\d+ stripe_sessions
