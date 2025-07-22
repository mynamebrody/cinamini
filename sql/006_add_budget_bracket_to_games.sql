-- Add Budget Bracket to the cinamini_games table

-- First, create the games table if it doesn't exist (following the existing pattern)
CREATE TABLE IF NOT EXISTS cinamini_games (
    game_id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    launch_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Budget Bracket game entry
INSERT INTO cinamini_games (game_id, display_name, description, is_active, launch_date) VALUES
('budget-bracket', 'Budget Bracket', 'Compare movie budgets in this daily guessing game. Pick the film with the higher production cost!', true, CURRENT_DATE)
ON CONFLICT (game_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Ensure Retitled game is also in the table
INSERT INTO cinamini_games (game_id, display_name, description, is_active, launch_date) VALUES
('retitled', 'Retitled', 'Guess the English movie title from its foreign translation in this daily puzzle.', true, CURRENT_DATE)
ON CONFLICT (game_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Add updated_at trigger for games table
DROP TRIGGER IF EXISTS update_cinamini_games_updated_at ON cinamini_games;
CREATE TRIGGER update_cinamini_games_updated_at
    BEFORE UPDATE ON cinamini_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE cinamini_games IS 'Available games in the CinaMini platform';
COMMENT ON COLUMN cinamini_games.game_id IS 'Unique identifier for the game (used in URLs)';
COMMENT ON COLUMN cinamini_games.display_name IS 'Human-readable name of the game';
COMMENT ON COLUMN cinamini_games.description IS 'Short description of the game mechanics';
COMMENT ON COLUMN cinamini_games.is_active IS 'Whether the game is currently available to play';
COMMENT ON COLUMN cinamini_games.launch_date IS 'When the game was first made available';