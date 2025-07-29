-- Fix Cast Climb RLS policy to allow INSERT operations
-- Add WITH CHECK clause to the server policy for INSERT permissions

-- Drop and recreate the server policy with both USING and WITH CHECK clauses
DROP POLICY "cast_climb_puzzles_server_policy" ON "public"."cast_climb_puzzles";

CREATE POLICY "cast_climb_puzzles_server_policy" ON "public"."cast_climb_puzzles" 
  USING ((current_setting('role'::text) = 'service_role'::text) OR (auth.role() IS NULL) OR (auth.role() = 'service_role'::text))
  WITH CHECK ((current_setting('role'::text) = 'service_role'::text) OR (auth.role() IS NULL) OR (auth.role() = 'service_role'::text));

-- Update comment
COMMENT ON POLICY "cast_climb_puzzles_server_policy" ON "public"."cast_climb_puzzles" IS 'Allows server operations and service role access for puzzle management (SELECT and INSERT)';