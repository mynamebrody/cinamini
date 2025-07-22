-- Create user favorite films table for storing up to 4 favorite movies per user
-- This table references TMDB movie IDs and includes movie metadata for performance

CREATE TABLE IF NOT EXISTS user_favorite_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  poster_path TEXT,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id),
  UNIQUE(user_id, position)
);

-- Indexes for performance
CREATE INDEX idx_user_favorite_films_user_id ON user_favorite_films(user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_favorite_films_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_favorite_films_updated_at ON user_favorite_films;
CREATE TRIGGER update_user_favorite_films_updated_at
    BEFORE UPDATE ON user_favorite_films
    FOR EACH ROW
    EXECUTE FUNCTION update_user_favorite_films_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE user_favorite_films ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own favorites
CREATE POLICY "Users can view own favorite films" ON user_favorite_films
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own favorites (with limit check in application)
CREATE POLICY "Users can insert own favorite films" ON user_favorite_films
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own favorites
CREATE POLICY "Users can update own favorite films" ON user_favorite_films
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorite films" ON user_favorite_films
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_favorite_films IS 'User favorite films (max 4) displayed on profile';
COMMENT ON COLUMN user_favorite_films.id IS 'Unique identifier for the favorite entry';
COMMENT ON COLUMN user_favorite_films.user_id IS 'References auth.users.id';
COMMENT ON COLUMN user_favorite_films.movie_id IS 'TMDB movie ID';
COMMENT ON COLUMN user_favorite_films.movie_title IS 'Cached movie title for performance';
COMMENT ON COLUMN user_favorite_films.poster_path IS 'TMDB poster path (relative URL)';
COMMENT ON COLUMN user_favorite_films.position IS 'Display position (1-4) in the grid';
COMMENT ON COLUMN user_favorite_films.created_at IS 'When the favorite was added';
COMMENT ON COLUMN user_favorite_films.updated_at IS 'When the favorite was last modified';