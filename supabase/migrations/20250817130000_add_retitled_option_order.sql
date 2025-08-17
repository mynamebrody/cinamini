-- Add option_order column to retitled_puzzles to preserve answer option order
ALTER TABLE "public"."retitled_puzzles" 
ADD COLUMN "option_order" integer[] DEFAULT NULL;

COMMENT ON COLUMN "public"."retitled_puzzles"."option_order" 
IS 'Complete ordered array of movie IDs including correct answer in user-defined order';

-- Update existing puzzles to have a default option_order (correct answer first, then distractors)
UPDATE "public"."retitled_puzzles" 
SET option_order = ARRAY[film_id] || distractor_ids
WHERE option_order IS NULL;