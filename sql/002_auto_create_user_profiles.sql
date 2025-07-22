-- Automatically create user profile when a new user signs up
-- This trigger ensures every user has a profile entry from the moment they register

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new profile for the newly created user
    INSERT INTO public.cinamini_user_profiles (user_id, display_name, created_at, updated_at)
    VALUES (NEW.id, NULL, NOW(), NOW());
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This fires after a new user is inserted into the auth.users table
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Grant necessary permissions for the trigger function
-- The function needs to be able to insert into the profiles table
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.cinamini_user_profiles TO supabase_auth_admin;

-- Add a comment explaining the trigger
COMMENT ON FUNCTION create_user_profile() IS 
'Automatically creates a user profile entry when a new user signs up. Ensures every user has a profile from registration.';

COMMENT ON TRIGGER create_user_profile_trigger ON auth.users IS 
'Triggers automatic profile creation for new users. Runs after user insertion into auth.users table.';