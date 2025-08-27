-- Remove puzzle_number columns from all game tables
-- Puzzle numbers are now calculated based on days since game launch dates
-- This eliminates database complexity and provides true sequential numbering

-- First, drop sequences and constraints that depend on puzzle_number columns
DROP SEQUENCE IF EXISTS "public"."retitled_puzzles_puzzle_number_seq" CASCADE;
DROP SEQUENCE IF EXISTS "public"."budget_bracket_puzzles_puzzle_number_seq" CASCADE;  
DROP SEQUENCE IF EXISTS "public"."poster_pixels_puzzles_puzzle_number_seq" CASCADE;

-- Remove any indexes on puzzle_number columns (if they exist)
DROP INDEX IF EXISTS "public"."idx_retitled_puzzles_puzzle_number";
DROP INDEX IF EXISTS "public"."idx_budget_bracket_puzzles_puzzle_number";
DROP INDEX IF EXISTS "public"."idx_cast_climb_puzzles_puzzle_number";
DROP INDEX IF EXISTS "public"."idx_poster_pixels_puzzles_puzzle_number";

-- Remove any unique constraints on puzzle_number columns (if they exist)
ALTER TABLE "public"."retitled_puzzles" DROP CONSTRAINT IF EXISTS "retitled_puzzles_puzzle_number_key";
ALTER TABLE "public"."budget_bracket_puzzles" DROP CONSTRAINT IF EXISTS "budget_bracket_puzzles_puzzle_number_key";
ALTER TABLE "public"."cast_climb_puzzles" DROP CONSTRAINT IF EXISTS "cast_climb_puzzles_puzzle_number_key";
ALTER TABLE "public"."poster_pixels_puzzles" DROP CONSTRAINT IF EXISTS "poster_pixels_puzzles_puzzle_number_key";

-- Now remove puzzle_number columns
ALTER TABLE "public"."retitled_puzzles" 
DROP COLUMN IF EXISTS "puzzle_number" CASCADE;

ALTER TABLE "public"."budget_bracket_puzzles"
DROP COLUMN IF EXISTS "puzzle_number" CASCADE;

ALTER TABLE "public"."cast_climb_puzzles" 
DROP COLUMN IF EXISTS "puzzle_number" CASCADE;

ALTER TABLE "public"."poster_pixels_puzzles"
DROP COLUMN IF EXISTS "puzzle_number" CASCADE;

-- Update launch dates in cinamini_games table to match actual launch history
UPDATE "public"."cinamini_games" SET 
  "launch_date" = CASE 
    WHEN "game_id" = 'retitled' THEN '2025-08-02'
    WHEN "game_id" = 'budget-bracket' THEN '2025-08-02'
    WHEN "game_id" = 'cast-climb' THEN '2025-08-02'
    WHEN "game_id" = 'poster-pixels' THEN '2025-08-02'
    ELSE "launch_date"
  END,
  "updated_at" = NOW()
WHERE "launch_date" IS NULL;