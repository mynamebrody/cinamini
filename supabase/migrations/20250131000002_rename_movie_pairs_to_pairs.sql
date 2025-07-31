-- Rename movie_pairs column to pairs in budget_bracket_puzzles table
-- This aligns with the API validation expectations

ALTER TABLE "public"."budget_bracket_puzzles" 
RENAME COLUMN "movie_pairs" TO "pairs";

-- Update the column comment to reflect the new name
COMMENT ON COLUMN "public"."budget_bracket_puzzles"."pairs" IS 'JSON array of movie pairs for each round with metadata';