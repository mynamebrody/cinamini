-- Supabase seed file for CinaMini platform
-- This file is automatically run when using `npx supabase db reset`

-- Insert core game definitions
INSERT INTO "public"."cinamini_games" ("game_id", "display_name", "description", "is_active", "launch_date", "created_at", "updated_at") VALUES 
('budget-bracket', 'Budget Bracket', 'Compare movie budgets in this daily guessing game. Pick the film with the higher production cost!', true, null, '2025-07-23 14:13:08.112905+00', '2025-07-27 20:04:31.075259+00'),
('retitled', 'Retitled', 'Guess the English movie title from its foreign translation in this daily puzzle.', true, null, '2025-07-22 19:06:19.251935+00', '2025-07-27 20:04:31.075259+00'),
('cast-climb', 'Cast Climb', 'Guess the movie from its cast list. Wrong guesses reveal more actors!', true, null, '2025-07-28 20:04:31.075259+00', '2025-07-28 20:04:31.075259+00'),
('poster-pixel', 'Poster Pixel', 'Guess the movie from its pixelated poster. Each wrong guess reveals more detail!', true, null, '2025-07-28 20:04:31.075259+00', '2025-07-28 20:04:31.075259+00')
ON CONFLICT (game_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add sample user profile (for development/testing)
-- Note: This will only work if there's an existing auth.users entry
-- You may need to sign up through the app first