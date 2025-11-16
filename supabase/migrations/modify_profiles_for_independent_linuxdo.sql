-- Modify profiles table to support independent Linux.do accounts
-- This allows Linux.do users to have their own profile without requiring a Supabase auth.users account

-- Step 1: Add new columns to support independent Linux.do profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_linuxdo_only boolean DEFAULT false;

-- Step 2: Update existing profiles to set auth_user_id = id (for existing Supabase users)
-- This maintains backward compatibility
UPDATE profiles 
SET auth_user_id = id 
WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- Step 3: Modify the id column to allow independent UUIDs
-- Drop the foreign key constraint to allow independent UUIDs for Linux.do-only profiles
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 4: Update RLS policies to support Linux.do-only profiles
-- Drop existing policies (including any that might have been created before)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Linux.do users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Linux.do users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Linux.do users can insert own profile" ON profiles;

-- Create new policies that support both Supabase users and Linux.do-only users
-- For authenticated Supabase users
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = auth_user_id OR 
    auth.uid() = id
  );

-- For Linux.do-only profiles, allow anon access (filtered by linuxdo_user_id in application)
-- This allows Linux.do users to access their profile without Supabase auth
CREATE POLICY "Linux.do users can view own profile"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true); -- Application code will filter by linuxdo_user_id

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auth_user_id OR 
    auth.uid() = id
  )
  WITH CHECK (
    auth.uid() = auth_user_id OR 
    auth.uid() = id
  );

-- Allow Linux.do users to update their profile (filtered by linuxdo_user_id in application)
CREATE POLICY "Linux.do users can update own profile"
  ON profiles FOR UPDATE
  TO anon, authenticated
  USING (true) -- Application code will filter by linuxdo_user_id
  WITH CHECK (true);

-- Allow inserting profiles for authenticated users (Supabase)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    auth.uid() = auth_user_id
  );

-- Allow Linux.do users to insert their profile (filtered by linuxdo_user_id in application)
CREATE POLICY "Linux.do users can insert own profile"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true); -- Application code will validate linuxdo_user_id

-- Step 5: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_linuxdo_user_id ON profiles(linuxdo_user_id) WHERE linuxdo_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_linuxdo_only ON profiles(is_linuxdo_only) WHERE is_linuxdo_only = true;

-- Step 6: Create a function to create Linux.do-only profiles
-- This function can be called with elevated privileges to bypass RLS if needed
-- Drop function if it exists to allow re-running the migration
DROP FUNCTION IF EXISTS create_linuxdo_profile(text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION create_linuxdo_profile(
  p_linuxdo_user_id text,
  p_email text,
  p_username text,
  p_avatar_url text,
  p_user_data jsonb
)
RETURNS profiles AS $$
DECLARE
  new_profile_id uuid;
  new_profile profiles;
BEGIN
  -- Generate a new UUID for the profile
  new_profile_id := uuid_generate_v4();
  
  -- Insert the new profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    avatar_url,
    linuxdo_user_id,
    linuxdo_username,
    linuxdo_avatar_url,
    linuxdo_user_data,
    auth_user_id,
    is_linuxdo_only
  ) VALUES (
    new_profile_id,
    p_email,
    p_username,
    p_avatar_url,
    p_linuxdo_user_id,
    p_username,
    p_avatar_url,
    p_user_data,
    NULL, -- No Supabase auth user
    true  -- This is a Linux.do-only profile
  )
  RETURNING * INTO new_profile;
  
  RETURN new_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows bypassing RLS

-- Add comments for documentation
COMMENT ON COLUMN profiles.auth_user_id IS 'Optional reference to auth.users(id). NULL for Linux.do-only profiles.';
COMMENT ON COLUMN profiles.is_linuxdo_only IS 'True if this profile is for a Linux.do-only user (no Supabase auth account).';
COMMENT ON FUNCTION create_linuxdo_profile IS 'Creates a new profile for a Linux.do-only user (no Supabase auth account).';
