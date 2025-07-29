-- Add is_published field to puzzle tables for admin management

-- Budget Bracket puzzles
ALTER TABLE "public"."budget_bracket_puzzles"
ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "public"."budget_bracket_puzzles"."is_published" IS 'Whether this puzzle is published and available to players';

-- Retitled puzzles
ALTER TABLE "public"."retitled_puzzles"
ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "public"."retitled_puzzles"."is_published" IS 'Whether this puzzle is published and available to players';

-- Cast Climb puzzles
ALTER TABLE "public"."cast_climb_puzzles"
ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "public"."cast_climb_puzzles"."is_published" IS 'Whether this puzzle is published and available to players';

-- Create indexes for efficient published puzzle queries
CREATE INDEX IF NOT EXISTS "idx_budget_bracket_puzzles_published" 
ON "public"."budget_bracket_puzzles" ("puzzle_date", "is_published") 
WHERE "is_published" = TRUE;

CREATE INDEX IF NOT EXISTS "idx_retitled_puzzles_published" 
ON "public"."retitled_puzzles" ("puzzle_date", "is_published") 
WHERE "is_published" = TRUE;

CREATE INDEX IF NOT EXISTS "idx_cast_climb_puzzles_published" 
ON "public"."cast_climb_puzzles" ("puzzle_date", "is_published") 
WHERE "is_published" = TRUE;

-- Update RLS policies to only show published puzzles to regular users
-- Budget Bracket
DROP POLICY IF EXISTS "Authenticated users can view puzzles" ON "public"."budget_bracket_puzzles";
CREATE POLICY "Users can view published puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR SELECT 
USING (
    "is_published" = TRUE 
    OR EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Retitled
CREATE POLICY "Users can view published puzzles" 
ON "public"."retitled_puzzles" 
FOR SELECT 
USING (
    "is_published" = TRUE 
    OR EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Cast Climb
CREATE POLICY "Users can view published puzzles" 
ON "public"."cast_climb_puzzles" 
FOR SELECT 
USING (
    "is_published" = TRUE 
    OR EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);