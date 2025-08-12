-- Fix clarity_level precision in poster_pixels tables
-- Change from numeric(3,2) to numeric(5,2) to support percentages like 40.00

BEGIN;

-- Fix poster_pixels_guesses.clarity_level precision
ALTER TABLE "public"."poster_pixels_guesses" 
ALTER COLUMN "clarity_level" TYPE numeric(5,2);

-- Fix poster_pixels_games.final_clarity_level precision  
ALTER TABLE "public"."poster_pixels_games"
ALTER COLUMN "final_clarity_level" TYPE numeric(5,2);

COMMIT;