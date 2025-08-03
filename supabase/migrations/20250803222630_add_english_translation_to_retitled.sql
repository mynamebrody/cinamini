-- Add english_translation column to retitled_puzzles table
ALTER TABLE "public"."retitled_puzzles" 
ADD COLUMN IF NOT EXISTS "english_translation" text;

-- Add a comment for the new column
COMMENT ON COLUMN "public"."retitled_puzzles"."english_translation" IS 'English translation of the localized title for display purposes';

-- Update any existing puzzles to have an empty string for english_translation
UPDATE "public"."retitled_puzzles" 
SET "english_translation" = ''
WHERE "english_translation" IS NULL;