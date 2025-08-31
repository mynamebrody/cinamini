-- Add hint system to all games
-- This migration adds hint text to puzzle tables and hint_used tracking to guess/game tables

-- 1. Add hint field to retitled_puzzles
ALTER TABLE retitled_puzzles 
ADD COLUMN IF NOT EXISTS hint TEXT;

-- 2. Add hint_used field to retitled_guesses (already exists in schema but let's ensure it's there)
ALTER TABLE retitled_guesses 
ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT FALSE;

-- 3. Add hint field to budget_bracket_puzzles
ALTER TABLE budget_bracket_puzzles 
ADD COLUMN IF NOT EXISTS hint TEXT;

-- 4. Add hint_used field to budget_bracket_games
ALTER TABLE budget_bracket_games 
ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT FALSE;

-- 5. Add hint field to cast_climb_puzzles
ALTER TABLE cast_climb_puzzles 
ADD COLUMN IF NOT EXISTS hint TEXT;

-- 6. Add hint_used field to cast_climb_guesses
ALTER TABLE cast_climb_guesses 
ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT FALSE;

-- 7. Add hint field to poster_pixels_puzzles
ALTER TABLE poster_pixels_puzzles 
ADD COLUMN IF NOT EXISTS hint TEXT;

-- 8. Add hint_used field to poster_pixels_games
ALTER TABLE poster_pixels_games 
ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT FALSE;

-- 9. Also add hint_used to poster_pixels_guesses for per-guess tracking
ALTER TABLE poster_pixels_guesses 
ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient querying of hint usage
CREATE INDEX IF NOT EXISTS idx_retitled_guesses_hint_used ON retitled_guesses(hint_used);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_games_hint_used ON budget_bracket_games(hint_used);
CREATE INDEX IF NOT EXISTS idx_cast_climb_guesses_hint_used ON cast_climb_guesses(hint_used);
CREATE INDEX IF NOT EXISTS idx_poster_pixels_games_hint_used ON poster_pixels_games(hint_used);

-- Add comments for documentation
COMMENT ON COLUMN retitled_puzzles.hint IS 'Optional hint text to help players guess the movie';
COMMENT ON COLUMN retitled_guesses.hint_used IS 'Whether the player used the hint before submitting their guess';
COMMENT ON COLUMN budget_bracket_puzzles.hint IS 'Optional hint text to help players with budget comparisons';
COMMENT ON COLUMN budget_bracket_games.hint_used IS 'Whether the player used the hint during the game';
COMMENT ON COLUMN cast_climb_puzzles.hint IS 'Optional hint text to help players identify the movie from cast';
COMMENT ON COLUMN cast_climb_guesses.hint_used IS 'Whether the player used the hint before this guess';
COMMENT ON COLUMN poster_pixels_puzzles.hint IS 'Optional hint text to help players identify the movie from poster';
COMMENT ON COLUMN poster_pixels_games.hint_used IS 'Whether the player used the hint during the game';