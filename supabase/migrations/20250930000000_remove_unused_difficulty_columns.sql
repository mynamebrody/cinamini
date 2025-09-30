-- Remove unused difficulty and metadata columns from all game tables
-- These columns are not used in the application logic and can be safely removed

-- Retitled: Remove difficulty_level
ALTER TABLE "public"."retitled_puzzles"
DROP COLUMN IF EXISTS "difficulty_level" CASCADE;

-- Poster Pixels: Remove difficulty_level and clarity_levels
ALTER TABLE "public"."poster_pixels_puzzles"
DROP COLUMN IF EXISTS "difficulty_level" CASCADE;

ALTER TABLE "public"."poster_pixels_puzzles"
DROP COLUMN IF EXISTS "clarity_levels" CASCADE;

-- Cast Climb: Remove total_actors and difficulty_level
-- total_actors can be calculated from actors.length
ALTER TABLE "public"."cast_climb_puzzles"
DROP COLUMN IF EXISTS "total_actors" CASCADE;

ALTER TABLE "public"."cast_climb_puzzles"
DROP COLUMN IF EXISTS "difficulty_level" CASCADE;

-- Budget Bracket: Remove difficulty_progression
ALTER TABLE "public"."budget_bracket_puzzles"
DROP COLUMN IF EXISTS "difficulty_progression" CASCADE;