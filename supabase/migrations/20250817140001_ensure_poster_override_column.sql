-- Ensure film_poster_override_url column exists on poster_pixels_puzzles table
-- This migration is safe to run multiple times

DO $$ 
BEGIN
    -- Check if the column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'poster_pixels_puzzles' 
        AND column_name = 'film_poster_override_url'
    ) THEN
        -- Add the column
        ALTER TABLE "public"."poster_pixels_puzzles" 
        ADD COLUMN "film_poster_override_url" TEXT DEFAULT NULL;
        
        -- Add comment to explain the column
        COMMENT ON COLUMN "public"."poster_pixels_puzzles"."film_poster_override_url" 
        IS 'Override poster URL when admin selects alternative poster from TMDB images. NULL means use default film_poster_url.';
        
        RAISE NOTICE 'Added film_poster_override_url column to poster_pixels_puzzles table';
    ELSE
        RAISE NOTICE 'film_poster_override_url column already exists in poster_pixels_puzzles table';
    END IF;
END $$;