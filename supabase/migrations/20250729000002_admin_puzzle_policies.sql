-- Add policies for admins to manage puzzles

-- Budget Bracket - Admin policies
CREATE POLICY "Admins can insert puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can update puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can delete puzzles" 
ON "public"."budget_bracket_puzzles" 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Retitled - Admin policies
CREATE POLICY "Admins can insert puzzles" 
ON "public"."retitled_puzzles" 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can update puzzles" 
ON "public"."retitled_puzzles" 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can delete puzzles" 
ON "public"."retitled_puzzles" 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Cast Climb - Admin policies
CREATE POLICY "Admins can insert puzzles" 
ON "public"."cast_climb_puzzles" 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can update puzzles" 
ON "public"."cast_climb_puzzles" 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can delete puzzles" 
ON "public"."cast_climb_puzzles" 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Enable RLS on puzzle tables if not already enabled
ALTER TABLE "public"."budget_bracket_puzzles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."retitled_puzzles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cast_climb_puzzles" ENABLE ROW LEVEL SECURITY;