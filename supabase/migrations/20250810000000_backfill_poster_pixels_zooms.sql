-- Backfill Poster Pixels data to align with zoom-based scoring
-- Set earliest guess per game as correct on first try and complete games

BEGIN;

-- 1) Mark the earliest guess for each game as correct and set guess_number = 1
WITH earliest AS (
  SELECT g.id, g.game_id
  FROM public.poster_pixels_guesses g
  JOIN (
    SELECT game_id, MIN(guess_number) AS min_guess
    FROM public.poster_pixels_guesses
    GROUP BY game_id
  ) m
  ON g.game_id = m.game_id AND g.guess_number = m.min_guess
)
UPDATE public.poster_pixels_guesses gg
SET is_correct = TRUE,
    guess_number = 1
FROM earliest e
WHERE gg.id = e.id;

-- 2) Complete all games that have at least one guess, mark as won, zero time, minimal clarity
UPDATE public.poster_pixels_games pg
SET completed = TRUE,
    won = TRUE,
    end_time = COALESCE(end_time, NOW()),
    total_time_ms = 0,
    num_guesses = 1,
    final_clarity_level = 0.05
WHERE EXISTS (
  SELECT 1 FROM public.poster_pixels_guesses g
  WHERE g.game_id = pg.id
);

COMMIT;