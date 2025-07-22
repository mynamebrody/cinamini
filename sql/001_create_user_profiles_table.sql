-- Create user profiles table for storing additional user data
-- This extends the built-in Supabase auth.users table

CREATE TABLE IF NOT EXISTS cinamini_user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cinamini_user_profiles_display_name 
ON cinamini_user_profiles(display_name);

CREATE INDEX IF NOT EXISTS idx_cinamini_user_profiles_updated_at 
ON cinamini_user_profiles(updated_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at when record changes
DROP TRIGGER IF EXISTS update_cinamini_user_profiles_updated_at ON cinamini_user_profiles;
CREATE TRIGGER update_cinamini_user_profiles_updated_at
    BEFORE UPDATE ON cinamini_user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE cinamini_user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own profile
CREATE POLICY "Users can view own profile" ON cinamini_user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON cinamini_user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON cinamini_user_profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users cannot delete their profile (they would delete their auth account instead)
-- But we'll allow it for admin purposes or if they delete their account
CREATE POLICY "Users can delete own profile" ON cinamini_user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE cinamini_user_profiles IS 'Extended user profile information for Cinamini users';
COMMENT ON COLUMN cinamini_user_profiles.user_id IS 'References auth.users.id - the primary user identifier';
COMMENT ON COLUMN cinamini_user_profiles.display_name IS 'User-chosen display name/username, must be unique';
COMMENT ON COLUMN cinamini_user_profiles.avatar_url IS 'URL to user avatar image (for future use)';
COMMENT ON COLUMN cinamini_user_profiles.created_at IS 'When the profile was first created';
COMMENT ON COLUMN cinamini_user_profiles.updated_at IS 'When the profile was last modified (auto-updated by trigger)';