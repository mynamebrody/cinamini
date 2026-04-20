-- Admin-pick Smart Generate: the dialog now runs the strategy in "manual"
-- selection mode, which inspects all candidates without short-circuiting
-- and hands the list to the admin to choose from. Those runs never build a
-- puzzle and never return a suggestions-style fallback, so they need their
-- own outcome bucket in puzzle_generation_logs to keep the analytics
-- queries honest ("how often does Smart Generate succeed on the first
-- pick?" vs "how often do admins click through to the picker?").

ALTER TABLE "public"."puzzle_generation_logs"
    DROP CONSTRAINT IF EXISTS "puzzle_generation_logs_outcome_check";

ALTER TABLE "public"."puzzle_generation_logs"
    ADD  CONSTRAINT "puzzle_generation_logs_outcome_check"
         CHECK ("outcome" IN ('success', 'suggestions', 'error', 'candidates_ready'));

COMMENT ON COLUMN "public"."puzzle_generation_logs"."outcome"
    IS 'success: a puzzle was returned. suggestions: generator failed, returned fallback TMDB suggestions. candidates_ready: admin-pick mode, strategy inspected all candidates and handed them to the dialog for selection. error: hard failure.';
