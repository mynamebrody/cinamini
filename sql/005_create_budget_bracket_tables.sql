-- Create Budget Bracket game tables

-- Table to store movies with budget data for Budget Bracket
CREATE TABLE IF NOT EXISTS budget_bracket_movies (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    production_budget BIGINT NOT NULL, -- Budget in USD
    budget_source VARCHAR(50) NOT NULL DEFAULT 'tmdb', -- 'tmdb', 'the_numbers', 'estimated'
    is_budget_estimated BOOLEAN DEFAULT FALSE,
    poster_path VARCHAR(255),
    release_date DATE,
    popularity_score DECIMAL(8,3), -- TMDB popularity score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store daily Budget Bracket puzzles
CREATE TABLE IF NOT EXISTS budget_bracket_puzzles (
    id SERIAL PRIMARY KEY,
    puzzle_date DATE UNIQUE NOT NULL,
    seed_value VARCHAR(32) NOT NULL, -- Deterministic seed for daily generation
    movie_pairs JSONB NOT NULL, -- Array of 5 pairs: [{"movieA": 123, "movieB": 456, "round": 1}, ...]
    difficulty_progression JSONB NOT NULL, -- Store difficulty ratios for each round
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store user gameplay sessions for Budget Bracket
CREATE TABLE IF NOT EXISTS budget_bracket_games (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    puzzle_id INTEGER REFERENCES budget_bracket_puzzles(id) ON DELETE CASCADE,
    rounds_completed INTEGER NOT NULL DEFAULT 0, -- How many rounds player completed (0-5)
    final_result VARCHAR(20) NOT NULL, -- 'perfect', 'failed_round_1', 'failed_round_2', etc.
    choices JSONB NOT NULL, -- Array of player choices: [{"round": 1, "chosen_movie": 123, "correct": true}, ...]
    total_duration_ms INTEGER, -- Time from start to end/fail
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one game per user per puzzle
    UNIQUE(user_id, puzzle_id)
);

-- Table to store Budget Bracket user statistics
CREATE TABLE IF NOT EXISTS budget_bracket_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    perfect_games INTEGER DEFAULT 0, -- Games where user got all 5 rounds
    current_streak INTEGER DEFAULT 0, -- Current daily streak
    best_streak INTEGER DEFAULT 0, -- Best ever daily streak
    total_rounds_won INTEGER DEFAULT 0, -- Sum of all rounds completed across all games
    average_round_reached DECIMAL(3,2) DEFAULT 0.00, -- Average rounds completed per game
    last_played_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budget_bracket_movies_tmdb_id ON budget_bracket_movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_movies_budget ON budget_bracket_movies(production_budget);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_movies_popularity ON budget_bracket_movies(popularity_score);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_puzzles_date ON budget_bracket_puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_games_user_puzzle ON budget_bracket_games(user_id, puzzle_id);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_games_completed_at ON budget_bracket_games(completed_at);
CREATE INDEX IF NOT EXISTS idx_budget_bracket_stats_user_id ON budget_bracket_stats(user_id);

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_budget_bracket_movies_updated_at ON budget_bracket_movies;
CREATE TRIGGER update_budget_bracket_movies_updated_at
    BEFORE UPDATE ON budget_bracket_movies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_bracket_stats_updated_at ON budget_bracket_stats;
CREATE TRIGGER update_budget_bracket_stats_updated_at
    BEFORE UPDATE ON budget_bracket_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE budget_bracket_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Movies: Read-only for authenticated users
CREATE POLICY "Authenticated users can view movies" ON budget_bracket_movies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Puzzles: Read-only for authenticated users
CREATE POLICY "Authenticated users can view puzzles" ON budget_bracket_puzzles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Games: Users can only see and modify their own games
CREATE POLICY "Users can view own games" ON budget_bracket_games
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON budget_bracket_games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games" ON budget_bracket_games
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Stats: Users can only see and modify their own stats
CREATE POLICY "Users can view own stats" ON budget_bracket_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON budget_bracket_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON budget_bracket_stats
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE budget_bracket_movies IS 'Movies with budget data for Budget Bracket game';
COMMENT ON TABLE budget_bracket_puzzles IS 'Daily Budget Bracket puzzle configurations';
COMMENT ON TABLE budget_bracket_games IS 'Individual user gameplay sessions for Budget Bracket';
COMMENT ON TABLE budget_bracket_stats IS 'Aggregated user statistics for Budget Bracket game';

-- Insert some sample movie data (for development/testing)
INSERT INTO budget_bracket_movies (tmdb_id, title, production_budget, budget_source, poster_path, release_date, popularity_score) VALUES
(299536, 'Avengers: Infinity War', 321000000, 'tmdb', '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', '2018-04-27', 125.0),
(299534, 'Avengers: Endgame', 356000000, 'tmdb', '/or06FN3Dka5tukK1e9sl16pB3iy.jpg', '2019-04-26', 145.0),
(597, 'Titanic', 200000000, 'tmdb', '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', '1997-11-18', 85.0),
(19995, 'Avatar', 237000000, 'tmdb', '/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg', '2009-12-18', 120.0),
(24428, 'The Avengers', 220000000, 'tmdb', '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', '2012-05-04', 100.0),
(118340, 'Guardians of the Galaxy', 170000000, 'tmdb', '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg', '2014-07-30', 90.0),
(315635, 'Spider-Man: Homecoming', 175000000, 'tmdb', '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', '2017-07-07', 88.0),
(550, 'Fight Club', 63000000, 'tmdb', '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', '1999-10-15', 95.0),
(155, 'The Dark Knight', 185000000, 'tmdb', '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', '2008-07-18', 110.0),
(27205, 'Inception', 160000000, 'tmdb', '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', '2010-07-16', 105.0)
ON CONFLICT (tmdb_id) DO NOTHING;