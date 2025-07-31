-- Add super admin field to user profiles
ALTER TABLE "public"."cinamini_user_profiles"
ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN "public"."cinamini_user_profiles"."is_super_admin" IS 'Designates if user has super admin privileges';

-- Create index for quick admin lookups
CREATE INDEX IF NOT EXISTS "idx_cinamini_user_profiles_is_super_admin" 
ON "public"."cinamini_user_profiles" ("is_super_admin") 
WHERE "is_super_admin" = TRUE;

-- Update RLS policies to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON "public"."cinamini_user_profiles" 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON "public"."cinamini_user_profiles" 
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