-- Add archived_date column to cinamini_games table
-- This column tracks when a game stopped receiving new daily puzzles

ALTER TABLE public.cinamini_games 
ADD COLUMN IF NOT EXISTS archived_date date;

COMMENT ON COLUMN public.cinamini_games.archived_date IS 'UTC date when this game stopped receiving new daily puzzles. When set and <= today, the game appears in the Archived Games section on the homepage.';

