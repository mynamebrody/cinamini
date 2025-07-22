-- Create profiles for existing users who don't have one yet
-- This handles users who signed up before the auto-creation trigger was implemented

INSERT INTO public.cinamini_user_profiles (user_id, display_name, created_at, updated_at)
SELECT 
    au.id,
    NULL as display_name,
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.cinamini_user_profiles cup ON au.id = cup.user_id
WHERE cup.user_id IS NULL  -- Only users who don't have a profile yet
AND au.deleted_at IS NULL  -- Only active users
ON CONFLICT (user_id) DO NOTHING;  -- Skip if profile already exists

-- Report how many profiles were created
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.cinamini_user_profiles;
    RAISE NOTICE 'Total user profiles after backfill: %', profile_count;
END $$;