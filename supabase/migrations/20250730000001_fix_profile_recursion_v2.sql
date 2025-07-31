-- Fix infinite recursion in cinamini_user_profiles policies (v2)
-- This completely removes the circular dependency by using a different approach

-- First, drop ALL existing policies on cinamini_user_profiles to start fresh
DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."cinamini_user_profiles";
DROP POLICY IF EXISTS "Admins can update all profiles" ON "public"."cinamini_user_profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."cinamini_user_profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."cinamini_user_profiles";
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."cinamini_user_profiles";
DROP POLICY IF EXISTS "Users can delete own profile" ON "public"."cinamini_user_profiles";

-- Drop the old function
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);

-- Create a new function that bypasses RLS completely
-- This function runs as the postgres user and disables row security
CREATE OR REPLACE FUNCTION public.check_is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Direct query without RLS
  SELECT is_super_admin INTO is_admin
  FROM public.cinamini_user_profiles
  WHERE user_id = check_user_id
  LIMIT 1;
  
  -- Return false if no profile found or not admin
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Ensure the function is owned by postgres for SECURITY DEFINER to work properly
ALTER FUNCTION public.check_is_super_admin(uuid) OWNER TO postgres;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_super_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_is_super_admin(uuid) TO service_role;

-- Create simplified policies that avoid recursion

-- SELECT policy: Users can view their own profile, admins can view all
CREATE POLICY "profile_select_policy" 
ON "public"."cinamini_user_profiles" 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    public.check_is_super_admin(auth.uid())
);

-- INSERT policy: Users can only insert their own profile
CREATE POLICY "profile_insert_policy" 
ON "public"."cinamini_user_profiles" 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id
);

-- UPDATE policy: Users can update their own profile, admins can update all
CREATE POLICY "profile_update_policy" 
ON "public"."cinamini_user_profiles" 
FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    public.check_is_super_admin(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR 
    public.check_is_super_admin(auth.uid())
);

-- DELETE policy: Users can delete their own profile, admins can delete all
CREATE POLICY "profile_delete_policy" 
ON "public"."cinamini_user_profiles" 
FOR DELETE 
USING (
    auth.uid() = user_id OR 
    public.check_is_super_admin(auth.uid())
);

-- Also update the admin check policies for other tables to use the new function
-- This prevents any other potential recursion issues

-- Update budget_bracket_puzzles policies
DROP POLICY IF EXISTS "Admins can insert puzzles" ON "public"."budget_bracket_puzzles";
DROP POLICY IF EXISTS "Admins can update puzzles" ON "public"."budget_bracket_puzzles";
DROP POLICY IF EXISTS "Admins can delete puzzles" ON "public"."budget_bracket_puzzles";

CREATE POLICY "Admins can insert puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR INSERT 
WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Admins can update puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR UPDATE 
USING (public.check_is_super_admin(auth.uid()))
WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR DELETE 
USING (public.check_is_super_admin(auth.uid()));

-- Update retitled_puzzles policies
DROP POLICY IF EXISTS "Admins can insert puzzles" ON "public"."retitled_puzzles";
DROP POLICY IF EXISTS "Admins can update puzzles" ON "public"."retitled_puzzles";
DROP POLICY IF EXISTS "Admins can delete puzzles" ON "public"."retitled_puzzles";

CREATE POLICY "Admins can insert puzzles" 
ON "public"."retitled_puzzles" 
FOR INSERT 
WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Admins can update puzzles" 
ON "public"."retitled_puzzles" 
FOR UPDATE 
USING (public.check_is_super_admin(auth.uid()))
WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete puzzles" 
ON "public"."retitled_puzzles" 
FOR DELETE 
USING (public.check_is_super_admin(auth.uid()));

-- Update cast_climb_puzzles policies
DROP POLICY IF EXISTS "Admins can insert puzzles" ON "public"."cast_climb_puzzles";
DROP POLICY IF EXISTS "Admins can update puzzles" ON "public"."cast_climb_puzzles";
DROP POLICY IF EXISTS "Admins can delete puzzles" ON "public"."cast_climb_puzzles";

CREATE POLICY "Admins can insert puzzles" 
ON "public"."cast_climb_puzzles" 
FOR INSERT 
WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Admins can update puzzles" 
ON "public"."cast_climb_puzzles" 
FOR UPDATE 
USING (public.check_is_super_admin(auth.uid()))
WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete puzzles" 
ON "public"."cast_climb_puzzles" 
FOR DELETE 
USING (public.check_is_super_admin(auth.uid()));

-- Update budget_bracket_puzzles view policies
DROP POLICY IF EXISTS "Users can view published puzzles" ON "public"."budget_bracket_puzzles";

CREATE POLICY "Users can view published puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR SELECT 
USING (
    is_published = true OR 
    public.check_is_super_admin(auth.uid())
);

-- Update retitled_puzzles view policies
DROP POLICY IF EXISTS "Users can view published puzzles" ON "public"."retitled_puzzles";

CREATE POLICY "Users can view published puzzles" 
ON "public"."retitled_puzzles" 
FOR SELECT 
USING (
    is_published = true OR 
    public.check_is_super_admin(auth.uid())
);

-- Update cast_climb_puzzles view policies
DROP POLICY IF EXISTS "Users can view published puzzles" ON "public"."cast_climb_puzzles";

CREATE POLICY "Users can view published puzzles" 
ON "public"."cast_climb_puzzles" 
FOR SELECT 
USING (
    is_published = true OR 
    public.check_is_super_admin(auth.uid())
);