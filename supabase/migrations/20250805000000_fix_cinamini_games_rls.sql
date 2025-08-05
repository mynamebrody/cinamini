-- Fix missing RLS policies for cinamini_games table
-- This allows public access to active games while maintaining security

-- Allow everyone to read active games (both authenticated and anonymous users)
CREATE POLICY "Allow public read access to active games" ON "public"."cinamini_games"
FOR SELECT USING ("is_active" = true);

-- Allow service role full access for management operations  
CREATE POLICY "Service role full access" ON "public"."cinamini_games" 
TO "service_role" USING (true) WITH CHECK (true);

-- Allow super admins to manage games
CREATE POLICY "Super admins can manage games" ON "public"."cinamini_games"
USING ("public"."check_is_super_admin"("auth"."uid"()))
WITH CHECK ("public"."check_is_super_admin"("auth"."uid"()));

-- Grant necessary permissions
GRANT SELECT ON "public"."cinamini_games" TO "anon";
GRANT SELECT ON "public"."cinamini_games" TO "authenticated";
GRANT ALL ON "public"."cinamini_games" TO "service_role";