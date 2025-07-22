-- Test script to verify the automatic profile creation trigger
-- This script can be run to test that profiles are automatically created

-- Check current state
SELECT 
    'Before test' as status,
    COUNT(*) as auth_users_count
FROM auth.users 
WHERE deleted_at IS NULL;

SELECT 
    'Before test' as status,
    COUNT(*) as profile_count
FROM public.cinamini_user_profiles;

-- Note: To properly test this trigger, you would need to create a new user
-- through the Supabase Auth API, not directly in the database.
-- The trigger only fires on actual user signups, not manual SQL inserts.

-- You can test this by:
-- 1. Going to your app's signup page
-- 2. Creating a new user account
-- 3. Running this query to verify the profile was created:

/*
SELECT 
    au.id,
    au.email,
    au.created_at as user_created,
    cup.user_id,
    cup.display_name,
    cup.created_at as profile_created
FROM auth.users au
LEFT JOIN public.cinamini_user_profiles cup ON au.id = cup.user_id
WHERE au.email = 'YOUR_TEST_EMAIL@example.com';
*/

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers 
WHERE trigger_name = 'create_user_profile_trigger';

-- Check if function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';