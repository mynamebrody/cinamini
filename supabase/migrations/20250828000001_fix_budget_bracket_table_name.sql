-- Fix Budget Bracket table naming to be consistent with other games
-- Rename budget_bracket_stats to budget_bracket_user_stats

-- First check if the old table exists and new doesn't
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'budget_bracket_stats') 
    AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'budget_bracket_user_stats') THEN
        -- Rename the table
        ALTER TABLE budget_bracket_stats RENAME TO budget_bracket_user_stats;
        
        -- Rename any indexes if they exist
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'budget_bracket_stats_pkey') THEN
            ALTER INDEX budget_bracket_stats_pkey RENAME TO budget_bracket_user_stats_pkey;
        END IF;
        
        -- Update any RLS policies
        ALTER POLICY IF EXISTS "Users can view own stats" ON budget_bracket_user_stats 
            RENAME TO "Users can view their own budget bracket stats";
        ALTER POLICY IF EXISTS "Users can update own stats" ON budget_bracket_user_stats 
            RENAME TO "Users can update their own budget bracket stats";
    END IF;
END $$;