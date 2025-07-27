-- Create table for caching TMDB trending movies data
-- This table helps avoid hitting TMDB rate limits and provides offline capability

CREATE TABLE IF NOT EXISTS tmdb_trending_cache (
    id TEXT PRIMARY KEY,
    time_window TEXT NOT NULL CHECK (time_window IN ('day', 'week')),
    movies_data JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tmdb_trending_cache_time_window ON tmdb_trending_cache(time_window);
CREATE INDEX IF NOT EXISTS idx_tmdb_trending_cache_expires_at ON tmdb_trending_cache(expires_at);

-- Add RLS (Row Level Security) if needed
ALTER TABLE tmdb_trending_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for all authenticated users
CREATE POLICY IF NOT EXISTS "Allow read access for trending cache" ON tmdb_trending_cache
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow insert/update for service role only
CREATE POLICY IF NOT EXISTS "Allow insert/update for service role" ON tmdb_trending_cache
    FOR ALL
    TO service_role
    USING (true);

-- Add helpful comment
COMMENT ON TABLE tmdb_trending_cache IS 'Cache table for TMDB trending movies data to reduce API calls and provide offline capability';
COMMENT ON COLUMN tmdb_trending_cache.time_window IS 'TMDB trending time window: day or week';
COMMENT ON COLUMN tmdb_trending_cache.movies_data IS 'JSON array of TMDBMovie objects';
COMMENT ON COLUMN tmdb_trending_cache.expires_at IS 'When this cache entry expires and should be refreshed';