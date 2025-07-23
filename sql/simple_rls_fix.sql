-- Simple fix for Budget Bracket RLS issues
-- Disable RLS for system tables, keep it for user data

-- =============================================================================
-- DISABLE RLS FOR SYSTEM TABLES
-- =============================================================================

-- These tables need to be accessible by the API for puzzle generation
ALTER TABLE budget_bracket_puzzles DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_movies DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- KEEP RLS FOR USER DATA TABLES  
-- =============================================================================

-- These tables contain user-specific data and should remain protected
ALTER TABLE budget_bracket_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_stats ENABLE ROW LEVEL SECURITY;

-- Ensure user data policies are correct
DROP POLICY IF EXISTS "Users can view own games" ON budget_bracket_games;
DROP POLICY IF EXISTS "Users can insert own games" ON budget_bracket_games;
DROP POLICY IF EXISTS "Users can update own games" ON budget_bracket_games;

CREATE POLICY "Users can view own games" ON budget_bracket_games
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON budget_bracket_games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games" ON budget_bracket_games
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Stats policies
DROP POLICY IF EXISTS "Users can view own stats" ON budget_bracket_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON budget_bracket_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON budget_bracket_stats;

CREATE POLICY "Users can view own stats" ON budget_bracket_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON budget_bracket_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON budget_bracket_stats
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'RLS fix applied successfully!';
    RAISE NOTICE 'System tables (puzzles, movies) are now accessible by API';
    RAISE NOTICE 'User data tables (games, stats) remain protected by RLS';
END $$; 