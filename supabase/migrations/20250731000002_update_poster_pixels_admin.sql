-- Update poster_pixels_puzzles table for admin system compatibility
-- This migration restructures the existing poster_pixels tables to match admin patterns
-- Also adds missing seed_value field to cast_climb_puzzles for consistency

-- Step 1: Add admin-required fields to poster_pixels_puzzles table
ALTER TABLE "public"."poster_pixels_puzzles"
ADD COLUMN IF NOT EXISTS "puzzle_number" INTEGER,
ADD COLUMN IF NOT EXISTS "film_id" INTEGER,
ADD COLUMN IF NOT EXISTS "film_title" VARCHAR,
ADD COLUMN IF NOT EXISTS "film_poster_url" TEXT,
ADD COLUMN IF NOT EXISTS "film_release_year" INTEGER,
ADD COLUMN IF NOT EXISTS "clarity_levels" JSONB DEFAULT '[5, 15, 35, 65, 100]'::jsonb,
ADD COLUMN IF NOT EXISTS "seed_value" VARCHAR(32),
ADD COLUMN IF NOT EXISTS "difficulty_level" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "fun_fact" TEXT,
ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Remove NOT NULL constraint from puzzle_date to allow drafts
ALTER TABLE "public"."poster_pixels_puzzles" 
ALTER COLUMN "puzzle_date" DROP NOT NULL;

-- Step 3: Create sequence for puzzle_number if needed
CREATE SEQUENCE IF NOT EXISTS "public"."poster_pixels_puzzles_puzzle_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" OWNED BY "public"."poster_pixels_puzzles"."puzzle_number";

-- Step 4: Set default for puzzle_number column
ALTER TABLE "public"."poster_pixels_puzzles" 
ALTER COLUMN "puzzle_number" SET DEFAULT nextval('"public"."poster_pixels_puzzles_puzzle_number_seq"'::regclass);

-- Step 5: Migrate existing movie_data JSONB to structured fields if data exists
-- This will extract structured data from the existing movie_data column
DO $$
DECLARE
    puzzle_record RECORD;
BEGIN
    -- Update existing records to populate new fields from movie_data JSONB
    FOR puzzle_record IN 
        SELECT id, movie_data 
        FROM "public"."poster_pixels_puzzles" 
        WHERE movie_data IS NOT NULL
    LOOP
        UPDATE "public"."poster_pixels_puzzles" 
        SET 
            film_id = COALESCE((puzzle_record.movie_data->>'id')::integer, (puzzle_record.movie_data->>'film_id')::integer),
            film_title = COALESCE(puzzle_record.movie_data->>'title', puzzle_record.movie_data->>'film_title'),
            film_poster_url = COALESCE(puzzle_record.movie_data->>'poster_path', puzzle_record.movie_data->>'film_poster_url'),
            film_release_year = CASE 
                WHEN puzzle_record.movie_data->>'release_date' IS NOT NULL 
                THEN EXTRACT(YEAR FROM (puzzle_record.movie_data->>'release_date')::date)::integer
                ELSE (puzzle_record.movie_data->>'film_release_year')::integer
            END,
            clarity_levels = COALESCE(puzzle_record.movie_data->'clarity_levels', '[5, 15, 35, 65, 100]'::jsonb),
            seed_value = COALESCE(puzzle_record.movie_data->>'seed', CONCAT('pp_', puzzle_record.id::text)),
            difficulty_level = COALESCE((puzzle_record.movie_data->>'difficulty_level')::integer, 1),
            fun_fact = puzzle_record.movie_data->>'fun_fact'
        WHERE id = puzzle_record.id;
    END LOOP;
END $$;

-- Step 6: Make required fields NOT NULL after migration
-- Update NULL puzzle_numbers with sequence values
UPDATE "public"."poster_pixels_puzzles" 
SET puzzle_number = nextval('"public"."poster_pixels_puzzles_puzzle_number_seq"'::regclass)
WHERE puzzle_number IS NULL;

-- Set NOT NULL constraints for required fields
ALTER TABLE "public"."poster_pixels_puzzles"
ALTER COLUMN "puzzle_number" SET NOT NULL,
ALTER COLUMN "film_id" SET NOT NULL,
ALTER COLUMN "film_title" SET NOT NULL,
ALTER COLUMN "film_poster_url" SET NOT NULL,
ALTER COLUMN "clarity_levels" SET NOT NULL,
ALTER COLUMN "seed_value" SET NOT NULL;

-- Step 7: Add constraints for data validation
ALTER TABLE "public"."poster_pixels_puzzles"
ADD CONSTRAINT "poster_pixels_puzzles_seed_format" 
CHECK (seed_value ~ '^[a-zA-Z0-9_-]+$' AND length(seed_value) <= 32),
ADD CONSTRAINT "poster_pixels_puzzles_difficulty_range" 
CHECK (difficulty_level >= 1 AND difficulty_level <= 4),
ADD CONSTRAINT "published_puzzles_must_have_date" 
CHECK (is_published = FALSE OR puzzle_date IS NOT NULL);

-- Step 8: Update unique constraint to allow NULL dates
ALTER TABLE "public"."poster_pixels_puzzles" 
DROP CONSTRAINT IF EXISTS "poster_pixels_puzzles_puzzle_date_key";

-- Create partial unique index for published puzzles only
CREATE UNIQUE INDEX IF NOT EXISTS "poster_pixels_puzzles_published_date_unique" 
ON "public"."poster_pixels_puzzles" ("puzzle_date") 
WHERE "puzzle_date" IS NOT NULL AND "is_published" = TRUE;

-- Step 9: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "idx_poster_pixels_puzzles_seed" 
ON "public"."poster_pixels_puzzles" USING btree ("seed_value");

CREATE INDEX IF NOT EXISTS "idx_poster_pixels_puzzles_published" 
ON "public"."poster_pixels_puzzles" ("puzzle_date", "is_published") 
WHERE "is_published" = TRUE;

CREATE INDEX IF NOT EXISTS "idx_poster_pixels_puzzles_film_id" 
ON "public"."poster_pixels_puzzles" USING btree ("film_id");

-- Step 10: Update RLS policies for admin access
-- Drop existing public read policy
DROP POLICY IF EXISTS "Puzzles are viewable by everyone" ON "public"."poster_pixels_puzzles";

-- Create new policy that shows published puzzles to users, all puzzles to admins
CREATE POLICY "Users can view published puzzles" 
ON "public"."poster_pixels_puzzles" 
FOR SELECT 
USING (
    "is_published" = TRUE 
    OR EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Add admin policies for INSERT, UPDATE, DELETE
CREATE POLICY "Admins can create puzzles" 
ON "public"."poster_pixels_puzzles" 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Admins can update puzzles" 
ON "public"."poster_pixels_puzzles" 
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
ON "public"."poster_pixels_puzzles" 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles" 
        WHERE "user_id" = auth.uid() 
        AND "is_super_admin" = TRUE
    )
);

-- Maintain service role access for system operations
CREATE POLICY "poster_pixels_puzzles_server_policy" ON "public"."poster_pixels_puzzles" 
  USING ((current_setting('role'::text) = 'service_role'::text) OR (auth.role() IS NULL) OR (auth.role() = 'service_role'::text))
  WITH CHECK ((current_setting('role'::text) = 'service_role'::text) OR (auth.role() IS NULL) OR (auth.role() = 'service_role'::text));

-- Step 11: Grant sequence permissions
GRANT ALL ON SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" TO "service_role";

-- Step 12: Add helpful comments
COMMENT ON COLUMN "public"."poster_pixels_puzzles"."puzzle_date" 
IS 'Puzzle date - NULL for draft puzzles, required when is_published=TRUE';

COMMENT ON COLUMN "public"."poster_pixels_puzzles"."puzzle_number" 
IS 'Sequential puzzle number for admin ordering and identification';

COMMENT ON COLUMN "public"."poster_pixels_puzzles"."seed_value" 
IS 'Deterministic seed value for reproducible puzzle generation';

COMMENT ON COLUMN "public"."poster_pixels_puzzles"."is_published" 
IS 'Whether this puzzle is published and available to players';

COMMENT ON COLUMN "public"."poster_pixels_puzzles"."clarity_levels" 
IS 'Array of clarity percentages for progressive poster reveal [5, 15, 35, 65, 100]';

COMMENT ON CONSTRAINT "published_puzzles_must_have_date" ON "public"."poster_pixels_puzzles" 
IS 'Ensures published puzzles have dates while allowing draft puzzles with NULL dates';

COMMENT ON POLICY "poster_pixels_puzzles_server_policy" ON "public"."poster_pixels_puzzles" 
IS 'Allows server operations and service role access for puzzle management';

-- Step 13: Optional - Create a view for easier admin queries
CREATE OR REPLACE VIEW "public"."poster_pixels_admin_view" AS
SELECT 
    id,
    puzzle_number,
    puzzle_date,
    film_id,
    film_title,
    film_poster_url,
    film_release_year,
    clarity_levels,
    seed_value,
    difficulty_level,
    fun_fact,
    is_published,
    created_at,
    updated_at,
    -- Legacy field for backward compatibility
    movie_data
FROM "public"."poster_pixels_puzzles"
ORDER BY puzzle_number DESC;

-- Grant view permissions
GRANT SELECT ON "public"."poster_pixels_admin_view" TO "authenticated";
GRANT SELECT ON "public"."poster_pixels_admin_view" TO "service_role";

-- Enable RLS on the view (inherits from base table)
ALTER VIEW "public"."poster_pixels_admin_view" OWNER TO "postgres";

-- BONUS: Add missing seed_value field to cast_climb_puzzles for consistency
-- All puzzle tables should have seed_value for deterministic generation
ALTER TABLE "public"."cast_climb_puzzles"
ADD COLUMN IF NOT EXISTS "seed_value" VARCHAR(32);

-- Update existing cast_climb puzzles with generated seed values
UPDATE "public"."cast_climb_puzzles" 
SET seed_value = CONCAT('cc_', puzzle_number::text)
WHERE seed_value IS NULL;

-- Make seed_value NOT NULL and add constraints
ALTER TABLE "public"."cast_climb_puzzles"
ALTER COLUMN "seed_value" SET NOT NULL;

-- Add constraint separately to handle IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cast_climb_puzzles_seed_format' 
        AND table_name = 'cast_climb_puzzles'
    ) THEN
        ALTER TABLE "public"."cast_climb_puzzles"
        ADD CONSTRAINT "cast_climb_puzzles_seed_format" 
        CHECK (seed_value ~ '^[a-zA-Z0-9_-]+$' AND length(seed_value) <= 32);
    END IF;
END $$;

-- Add index for cast_climb seed values
CREATE INDEX IF NOT EXISTS "idx_cast_climb_puzzles_seed" 
ON "public"."cast_climb_puzzles" USING btree ("seed_value");

-- Add comment
COMMENT ON COLUMN "public"."cast_climb_puzzles"."seed_value" 
IS 'Deterministic seed value for reproducible puzzle generation';