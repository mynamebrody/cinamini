-- Force remove NOT NULL constraint from puzzle_date column
-- This is a targeted fix for the draft puzzle save issue

-- Explicitly set puzzle_date columns to allow NULL
-- Use DROP NOT NULL even if it might already be nullable
DO $$ 
BEGIN
    -- Remove NOT NULL from retitled_puzzles
    BEGIN
        ALTER TABLE "public"."retitled_puzzles" 
        ALTER COLUMN "puzzle_date" DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if constraint doesn't exist
        NULL;
    END;

    -- Remove NOT NULL from budget_bracket_puzzles
    BEGIN
        ALTER TABLE "public"."budget_bracket_puzzles" 
        ALTER COLUMN "puzzle_date" DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if constraint doesn't exist
        NULL;
    END;

    -- Remove NOT NULL from cast_climb_puzzles
    BEGIN
        ALTER TABLE "public"."cast_climb_puzzles" 
        ALTER COLUMN "puzzle_date" DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if constraint doesn't exist
        NULL;
    END;
END $$;

-- Verify the change by adding a comment
COMMENT ON COLUMN "public"."retitled_puzzles"."puzzle_date" 
IS 'Puzzle date - NULL for draft puzzles, required when is_published=TRUE';

COMMENT ON COLUMN "public"."budget_bracket_puzzles"."puzzle_date" 
IS 'Puzzle date - NULL for draft puzzles, required when is_published=TRUE';

COMMENT ON COLUMN "public"."cast_climb_puzzles"."puzzle_date" 
IS 'Puzzle date - NULL for draft puzzles, required when is_published=TRUE';