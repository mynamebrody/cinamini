-- Fix Cast Climb anonymous user access
-- Allow anonymous users to read puzzles but not other tables

BEGIN;

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "cast_climb_puzzles_select_policy" ON "public"."cast_climb_puzzles";

-- Create new policy that allows both authenticated and anonymous users to read puzzles
CREATE POLICY "cast_climb_puzzles_select_policy" ON "public"."cast_climb_puzzles"
    FOR SELECT USING (true);

-- Add comment explaining the policy
COMMENT ON POLICY "cast_climb_puzzles_select_policy" ON "public"."cast_climb_puzzles" 
    IS 'Allows all users (authenticated and anonymous) to read Cast Climb puzzles';

COMMIT;