-- Supabase seed file for CinaMini platform
-- This file is automatically run when using `npx supabase db reset`

-- Insert core game definitions
INSERT INTO "public"."cinamini_games" ("game_id", "display_name", "description", "is_active", "launch_date", "created_at", "updated_at") VALUES 
('budget-bracket', 'Budget Bracket', 'Compare movie budgets in this daily guessing game. Pick the film with the higher production cost!', true, null, '2025-07-23 14:13:08.112905+00', '2025-07-27 20:04:31.075259+00'),
('retitled', 'Retitled', 'Guess the English movie title from its foreign translation in this daily puzzle.', true, null, '2025-07-22 19:06:19.251935+00', '2025-07-27 20:04:31.075259+00'),
('poster-pixels', 'Poster Pixels', 'Guess the movie from its pixelated poster as it becomes clearer over 30 seconds!', true, null, NOW(), NOW()),
('cast-climb', 'Cast Climb', 'Guess the movie from its cast list. Wrong guesses reveal more actors!', true, null, '2025-07-28 20:04:31.075259+00', '2025-07-28 20:04:31.075259+00')
ON CONFLICT (game_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create a super admin user (You'll need to create this user via Supabase Auth first)
-- Email: admin@cinamini.com
-- Password: [Set a secure password when creating the user]
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@cinamini.com' 
  LIMIT 1;

  -- If admin user exists, create/update their profile
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO "public"."cinamini_user_profiles" (
      "user_id", 
      "display_name", 
      "is_super_admin",
      "created_at", 
      "updated_at"
    ) VALUES (
      admin_user_id,
      'Admin',
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      is_super_admin = TRUE,
      updated_at = NOW();

    RAISE NOTICE 'Super admin profile created/updated for admin@cinamini.com';
  ELSE
    RAISE NOTICE 'Admin user not found. Please create user admin@cinamini.com via Supabase Auth first.';
  END IF;
END $$;

-- Add sample user profile (for development/testing)
-- Note: This will only work if there's an existing auth.users entry
-- You may need to sign up through the app first