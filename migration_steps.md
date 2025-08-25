# Database Consolidation Migration Steps

## Manual Steps to Consolidate Users and Profiles Tables

### Step 1: Add bio column to users table
Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
```

### Step 2: Migrate any existing bio data from profiles to users
Run this SQL in your Supabase SQL Editor:

```sql
UPDATE public.users 
SET bio = profiles.bio
FROM public.profiles 
WHERE public.users.id = profiles.user_id 
AND profiles.bio IS NOT NULL;
```

### Step 3: Drop the profiles table and related triggers
Run this SQL in your Supabase SQL Editor:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS "sync_profile_display_name_on_insert" ON public.profiles;
DROP TRIGGER IF EXISTS "sync_profile_display_name_on_update" ON public.profiles;

-- Drop function
DROP FUNCTION IF EXISTS public.sync_display_name_to_users();

-- Drop profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;
```

### Step 4: Verify the migration
Run this SQL to verify:

```sql
-- Check users table structure
\d public.users;

-- Check that profiles table is gone
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check users with bio data
SELECT id, email, full_name, bio FROM public.users WHERE bio IS NOT NULL;
```

## Code Changes Made

✅ Updated `database.types.ts` - Removed profiles table, added users table with bio field
✅ Updated `types/user.ts` - Added bio field to User interface, created UserWithProfile alias
✅ Updated `services/user.ts` - Removed all profile logic, simplified to work with users table only
✅ Updated `hooks/useAuth.tsx` - Changed to use new `createUser` method instead of `createUserWithProfile`

## Testing

After running the database migration:
1. Test user registration - should create user record with bio field
2. Test user data retrieval - should work with simplified User interface
3. Test My Account page - should display user data correctly
4. Verify no profile-related errors in console
