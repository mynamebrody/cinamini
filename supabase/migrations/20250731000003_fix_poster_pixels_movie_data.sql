-- Fix poster_pixels_puzzles movie_data column constraint
-- This is a hotfix to allow poster pixels puzzles to save while maintaining backward compatibility

-- Remove NOT NULL constraint from movie_data column
ALTER TABLE "public"."poster_pixels_puzzles" 
ALTER COLUMN "movie_data" DROP NOT NULL;

-- Ensure all the admin fields exist and have defaults
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
ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN DEFAULT false;

-- Create sequence for puzzle_number if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'poster_pixels_puzzles_puzzle_number_seq') THEN
        CREATE SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" 
            AS integer
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
        
        ALTER SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" OWNER TO "postgres";
        ALTER SEQUENCE "public"."poster_pixels_puzzles_puzzle_number_seq" OWNED BY "public"."poster_pixels_puzzles"."puzzle_number";
        
        ALTER TABLE "public"."poster_pixels_puzzles" 
        ALTER COLUMN "puzzle_number" SET DEFAULT nextval('"public"."poster_pixels_puzzles_puzzle_number_seq"'::regclass);
    END IF;
END $$;

-- Update existing records to have puzzle numbers if they don't
UPDATE "public"."poster_pixels_puzzles" 
SET puzzle_number = nextval('"public"."poster_pixels_puzzles_puzzle_number_seq"'::regclass)
WHERE puzzle_number IS NULL;

-- Set default seed values for existing records
UPDATE "public"."poster_pixels_puzzles" 
SET seed_value = CONCAT('pp_', puzzle_number::text)
WHERE seed_value IS NULL;

-- Remove NOT NULL constraint from puzzle_date if it exists (for draft puzzles)
DO $$
BEGIN
    ALTER TABLE "public"."poster_pixels_puzzles" 
    ALTER COLUMN "puzzle_date" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if constraint doesn't exist
    NULL;
END $$;

-- Add admin RLS policy for insert operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Admins can insert puzzles' 
        AND tablename = 'poster_pixels_puzzles'
    ) THEN
        CREATE POLICY "Admins can insert puzzles" 
        ON "public"."poster_pixels_puzzles" 
        FOR INSERT 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM "public"."cinamini_user_profiles" 
                WHERE "user_id" = auth.uid() 
                AND "is_super_admin" = TRUE
            )
        );
    END IF;
END $$;