-- Allow NULL puzzle_date for draft puzzles across all puzzle tables
-- This enables the admin system to save draft puzzles without assigned dates

-- Remove NOT NULL constraints from puzzle_date columns
ALTER TABLE "public"."retitled_puzzles" 
ALTER COLUMN "puzzle_date" DROP NOT NULL;

ALTER TABLE "public"."budget_bracket_puzzles" 
ALTER COLUMN "puzzle_date" DROP NOT NULL;

ALTER TABLE "public"."cast_climb_puzzles" 
ALTER COLUMN "puzzle_date" DROP NOT NULL;

-- Add CHECK constraints to ensure published puzzles have dates
-- This maintains data integrity while allowing draft puzzles
ALTER TABLE "public"."retitled_puzzles" 
ADD CONSTRAINT "published_puzzles_must_have_date" 
CHECK (is_published = FALSE OR puzzle_date IS NOT NULL);

ALTER TABLE "public"."budget_bracket_puzzles" 
ADD CONSTRAINT "published_puzzles_must_have_date" 
CHECK (is_published = FALSE OR puzzle_date IS NOT NULL);

ALTER TABLE "public"."cast_climb_puzzles" 
ADD CONSTRAINT "published_puzzles_must_have_date" 
CHECK (is_published = FALSE OR puzzle_date IS NOT NULL);

-- Add comments explaining the constraint logic
COMMENT ON CONSTRAINT "published_puzzles_must_have_date" ON "public"."retitled_puzzles" 
IS 'Ensures published puzzles have dates while allowing draft puzzles with NULL dates';

COMMENT ON CONSTRAINT "published_puzzles_must_have_date" ON "public"."budget_bracket_puzzles" 
IS 'Ensures published puzzles have dates while allowing draft puzzles with NULL dates';

COMMENT ON CONSTRAINT "published_puzzles_must_have_date" ON "public"."cast_climb_puzzles" 
IS 'Ensures published puzzles have dates while allowing draft puzzles with NULL dates';