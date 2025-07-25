-- Add Budget Bracket to the existing cinamini_games table

-- Add missing columns to existing games table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cinamini_games' AND column_name = 'updated_at') THEN
        ALTER TABLE cinamini_games ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cinamini_games' AND column_name = 'launch_date') THEN
        ALTER TABLE cinamini_games ADD COLUMN launch_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Insert Budget Bracket game entry
INSERT INTO cinamini_games (game_id, display_name, description, is_active, launch_date) VALUES
('budget-bracket', 'Budget Bracket', 'Compare movie budgets in this daily guessing game. Pick the film with the higher production cost!', true, CURRENT_DATE)
ON CONFLICT (game_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Update Retitled game description if needed
INSERT INTO cinamini_games (game_id, display_name, description, is_active, launch_date) VALUES
('retitled', 'Retitled', 'Guess the English movie title from its foreign translation in this daily puzzle.', true, CURRENT_DATE)
ON CONFLICT (game_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Add updated_at trigger for games table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cinamini_games_updated_at') THEN
        CREATE TRIGGER update_cinamini_games_updated_at
            BEFORE UPDATE ON cinamini_games
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;