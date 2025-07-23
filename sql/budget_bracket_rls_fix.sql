-- Fix RLS policies for Budget Bracket
-- This allows the system to create puzzles while maintaining security

-- =============================================================================
-- FIX PUZZLE CREATION POLICIES
-- =============================================================================

-- Drop the restrictive puzzle policy
DROP POLICY IF EXISTS "Authenticated users can view puzzles" ON budget_bracket_puzzles;

-- Create new policies that allow system operations
-- 1. Allow authenticated users to read puzzles
CREATE POLICY "Users can view puzzles" ON budget_bracket_puzzles
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow service role to create puzzles (for API puzzle generation)
CREATE POLICY "Service role can manage puzzles" ON budget_bracket_puzzles
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- =============================================================================
-- FIX MOVIE DATA POLICIES  
-- =============================================================================

-- Drop and recreate movie policies to allow system operations
DROP POLICY IF EXISTS "Authenticated users can view movies" ON budget_bracket_movies;

-- Allow reading movies for authenticated users
CREATE POLICY "Users can view movies" ON budget_bracket_movies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage movie data
CREATE POLICY "Service role can manage movies" ON budget_bracket_movies
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- =============================================================================
-- ALTERNATIVE: DISABLE RLS FOR SYSTEM TABLES (Simpler approach)
-- =============================================================================

-- If the above doesn't work, we can disable RLS for tables that need system access
-- Uncomment these lines if you prefer this approach:

-- ALTER TABLE budget_bracket_puzzles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_bracket_movies DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled for user-specific tables
-- ALTER TABLE budget_bracket_games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_bracket_stats ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Budget Bracket RLS policies updated!';
    RAISE NOTICE 'Puzzles and movies should now be accessible by the API';
END $$; 