-- Remove auto-increment default from puzzle_number columns
-- This ensures puzzle numbers are calculated based on the last puzzle date
-- rather than auto-incrementing on insert

-- Remove default from retitled_puzzles
ALTER TABLE "public"."retitled_puzzles" 
ALTER COLUMN "puzzle_number" DROP DEFAULT;

-- Remove default from budget_bracket_puzzles
ALTER TABLE "public"."budget_bracket_puzzles" 
ALTER COLUMN "puzzle_number" DROP DEFAULT;

-- Remove default from poster_pixels_puzzles
ALTER TABLE "public"."poster_pixels_puzzles" 
ALTER COLUMN "puzzle_number" DROP DEFAULT;

-- Note: cast_climb_puzzles doesn't have an auto-increment default,
-- so no change needed there

-- We keep the sequences themselves for potential future use,
-- but they're no longer automatically applied