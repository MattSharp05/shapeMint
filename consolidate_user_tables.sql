-- Migration script to consolidate users and profiles tables
-- This script will:
-- 1. Add bio field to users table
-- 2. Migrate any unique data from profiles to users
-- 3. Drop the profiles table and related triggers/functions

-- Step 1: Add bio field to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Step 2: Migrate data from profiles to users (if any profiles exist)
-- Update users table with bio data from profiles table
UPDATE public.users 
SET bio = profiles.bio
FROM public.profiles 
WHERE public.users.id = profiles.user_id 
AND profiles.bio IS NOT NULL;

-- Step 3: Drop triggers that sync between profiles and users
DROP TRIGGER IF EXISTS "sync_profile_display_name_on_insert" ON public.profiles;
DROP TRIGGER IF EXISTS "sync_profile_display_name_on_update" ON public.profiles;

-- Step 4: Drop the sync function
DROP FUNCTION IF EXISTS public.sync_display_name_to_users();

-- Step 5: Drop the profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 6: Update any foreign key constraints that might reference profiles
-- (Check if any other tables reference profiles - none found in current schema)

-- Verification queries (run these after migration to verify):
-- SELECT COUNT(*) FROM public.users; -- Should show all users
-- SELECT bio FROM public.users WHERE bio IS NOT NULL; -- Should show migrated bios
-- SELECT * FROM information_schema.tables WHERE table_name = 'profiles'; -- Should return empty
