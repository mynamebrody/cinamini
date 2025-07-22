-- Create game registry table if it doesn't exist
CREATE TABLE IF NOT EXISTS cinamini_games (
    game_id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    launch_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game registry entry for Retitle
INSERT INTO cinamini_games (game_id, display_name, description, is_active)
VALUES ('retitled', 'Retitle', 'Identify movies from their foreign titles', true)
ON CONFLICT (game_id) DO NOTHING;

-- Create daily puzzles table for Retitle game
CREATE TABLE IF NOT EXISTS retitled_puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_date DATE UNIQUE NOT NULL,
    film_id INTEGER NOT NULL,
    film_title VARCHAR NOT NULL,
    localized_title VARCHAR NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR NOT NULL,
    distractor_ids INTEGER[] NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    translation_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user guesses table for Retitle game
CREATE TABLE IF NOT EXISTS retitled_guesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    puzzle_id UUID REFERENCES retitled_puzzles(id) ON DELETE CASCADE,
    guess_film_id INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    solve_time_ms INTEGER,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, puzzle_id)
);

-- Create game-specific statistics table for Retitle
CREATE TABLE IF NOT EXISTS retitled_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_correct INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    average_solve_time_ms INTEGER,
    countries_guessed JSONB DEFAULT '[]',
    last_played_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_retitled_puzzles_date ON retitled_puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_retitled_guesses_user ON retitled_guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_retitled_guesses_puzzle ON retitled_guesses(puzzle_id);

-- Insert the hardcoded puzzle for MVP
INSERT INTO retitled_puzzles (
    puzzle_date,
    film_id,
    film_title,
    localized_title,
    country_code,
    country_name,
    distractor_ids,
    difficulty_level,
    translation_note
) VALUES (
    CURRENT_DATE,
    562,
    'Die Hard',
    'Piège de Cristal',
    'FR',
    'France',
    ARRAY[679, 78, 280],
    1,
    'The French title translates to ''Crystal Trap'', referring to the glass-heavy Nakatomi Plaza'
) ON CONFLICT (puzzle_date) DO NOTHING;