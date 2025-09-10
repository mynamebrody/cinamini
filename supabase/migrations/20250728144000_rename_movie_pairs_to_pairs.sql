-- Rename movie_pairs column to pairs in budget_bracket_puzzles table, idempotently
-- Placed after base remote schema creation so the table exists on fresh databases.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'budget_bracket_puzzles'
      AND column_name  = 'movie_pairs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'budget_bracket_puzzles'
      AND column_name  = 'pairs'
  ) THEN
    ALTER TABLE public.budget_bracket_puzzles
    RENAME COLUMN movie_pairs TO pairs;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'budget_bracket_puzzles'
      AND column_name  = 'pairs'
  ) THEN
    COMMENT ON COLUMN public.budget_bracket_puzzles.pairs
      IS 'JSON array of movie pairs for each round with metadata';
  END IF;
END $$;

