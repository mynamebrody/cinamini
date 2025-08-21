-- Add optional name to Budget Bracket puzzles
-- Allows labeling specific puzzles; shown in admin scheduler, gameplay UI, and share text

ALTER TABLE "public"."budget_bracket_puzzles"
  ADD COLUMN IF NOT EXISTS "name" text;

COMMENT ON COLUMN "public"."budget_bracket_puzzles"."name" IS 'Optional display name for the Budget Bracket puzzle';

