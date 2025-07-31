-- Fix infinite recursion in cinamini_user_profiles policies
-- The admin policies were checking the same table they were protecting, causing circular dependency

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."cinamini_user_profiles";
DROP POLICY IF EXISTS "Admins can update all profiles" ON "public"."cinamini_user_profiles";

-- Create a function to check if current user is admin
-- This avoids the circular dependency by using a direct query with security definer
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.cinamini_user_profiles 
    WHERE user_id = check_user_id 
    AND is_super_admin = TRUE
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- Create new admin policies using the function
CREATE POLICY "Admins can view all profiles" 
ON "public"."cinamini_user_profiles" 
FOR SELECT 
USING (
    auth.uid() = user_id OR -- Users can see their own profile
    public.is_super_admin(auth.uid()) -- Admins can see all profiles
);

-- Update the existing "Users can view own profile" policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."cinamini_user_profiles";

-- Admin update policy
CREATE POLICY "Admins can update all profiles" 
ON "public"."cinamini_user_profiles" 
FOR UPDATE 
USING (
    auth.uid() = user_id OR -- Users can update their own profile
    public.is_super_admin(auth.uid()) -- Admins can update all profiles
)
WITH CHECK (
    auth.uid() = user_id OR -- Users can update their own profile
    public.is_super_admin(auth.uid()) -- Admins can update all profiles
);

-- Update the existing "Users can update own profile" policy to avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."cinamini_user_profiles";

-- Ensure users can still insert their own profile
-- Keep the existing insert and delete policies as they are fine