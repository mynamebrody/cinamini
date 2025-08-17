-- Add poster override capability to Poster Pixels puzzles

-- Add column to store alternative poster URL
ALTER TABLE "public"."poster_pixels_puzzles" 
ADD COLUMN IF NOT EXISTS "film_poster_override_url" TEXT DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN "public"."poster_pixels_puzzles"."film_poster_override_url" 
IS 'Override poster URL when admin selects alternative poster from TMDB images. NULL means use default film_poster_url.';