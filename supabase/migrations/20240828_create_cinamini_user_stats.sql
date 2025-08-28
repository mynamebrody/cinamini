-- Create cinamini_user_stats table for cross-game statistics
CREATE TABLE IF NOT EXISTS cinamini_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_games_played INTEGER DEFAULT 0,
    total_days_active INTEGER DEFAULT 0,
    longest_daily_streak INTEGER DEFAULT 0,
    current_daily_streak INTEGER DEFAULT 0,
    last_played_date DATE,
    favorite_game VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cinamini_user_stats_last_played ON cinamini_user_stats(last_played_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_cinamini_user_stats_updated_at
BEFORE UPDATE ON cinamini_user_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE cinamini_user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own stats" 
    ON cinamini_user_stats 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" 
    ON cinamini_user_stats 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
    ON cinamini_user_stats 
    FOR UPDATE 
    USING (auth.uid() = user_id);