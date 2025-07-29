-- Fix Cast Climb RLS policies for puzzle insertion
-- Adds missing INSERT policies to allow server-side puzzle generation

-- Add server policy for cast_climb_puzzles (allows service role and server operations)
CREATE POLICY "cast_climb_puzzles_server_policy" ON "public"."cast_climb_puzzles" 
  USING ((current_setting('role'::text) = 'service_role'::text) OR (auth.role() IS NULL) OR (auth.role() = 'service_role'::text));

-- Add service role policy for cast_climb_puzzles (full access for service role)
CREATE POLICY "cast_climb_puzzles_service_policy" ON "public"."cast_climb_puzzles" 
  TO "service_role" USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON POLICY "cast_climb_puzzles_server_policy" ON "public"."cast_climb_puzzles" IS 'Allows server operations and service role access for puzzle management';
COMMENT ON POLICY "cast_climb_puzzles_service_policy" ON "public"."cast_climb_puzzles" IS 'Full access policy for service role operations';