-- Cache for Smart Generate admin-pick (manual selectionMode) candidate runs.
--
-- Phase 1 of the picker dialog streams N candidates, each inspected by the
-- strategy (verdict + TMDB movieData + reasoning). The result is expensive:
-- one LLM call + up to 3x per-candidate TMDB/translate fan-outs. We cache the
-- CandidateAttempt[] payload keyed by game_type so the next admin to open the
-- dialog sees the picker instantly instead of waiting for the pipeline again.
--
-- Key is game_type ONLY. target_date and config_snapshot are stored for
-- diagnostics / UI badging but are NOT part of the cache key. Phase 2 still
-- runs the full forcedFilmId pipeline on click, so a stale "accepted" card
-- will safely re-check exclusion windows before anything ships.

CREATE TABLE IF NOT EXISTS "public"."smart_gen_candidate_cache" (
    "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    "game_type"        text        NOT NULL,
    "attempts"         jsonb       NOT NULL,
    "target_date"      date,
    "config_snapshot"  jsonb,
    "cache_version"    text        NOT NULL DEFAULT '1.0',
    "created_at"       timestamptz NOT NULL DEFAULT now(),
    "expires_at"       timestamptz NOT NULL,
    CONSTRAINT "smart_gen_candidate_cache_game_type_check"
        CHECK ("game_type" IN ('retitled', 'cast-climb', 'poster-pixels'))
);

COMMENT ON TABLE  "public"."smart_gen_candidate_cache"
    IS 'Caches phase-1 candidates-ready output per game_type. One fresh row per game_type; overwritten whenever admin runs Smart Generate in manual selectionMode. 24h TTL via expires_at.';
COMMENT ON COLUMN "public"."smart_gen_candidate_cache"."attempts"
    IS 'JSON array of CandidateAttempt (see lib/puzzle-generator/types.ts): one entry per inspected candidate, including verdict, reasoning, and movieData.';
COMMENT ON COLUMN "public"."smart_gen_candidate_cache"."target_date"
    IS 'Snapshot of the target_date when the cache was written. Not part of cache key - stored for UI badging only.';
COMMENT ON COLUMN "public"."smart_gen_candidate_cache"."config_snapshot"
    IS 'Snapshot of LegacyClientConfig at write time (minVoteCount, budgetClosenessThreshold, avoid*). Not part of cache key - used only to badge "config changed since cache" in the dialog.';
COMMENT ON COLUMN "public"."smart_gen_candidate_cache"."expires_at"
    IS 'When this cache entry expires (24h from write). Reads filter by expires_at >= now().';

CREATE INDEX IF NOT EXISTS "idx_smart_gen_candidate_cache_lookup"
    ON "public"."smart_gen_candidate_cache" ("game_type", "expires_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_smart_gen_candidate_cache_cleanup"
    ON "public"."smart_gen_candidate_cache" ("expires_at");

ALTER TABLE "public"."smart_gen_candidate_cache" ENABLE ROW LEVEL SECURITY;

-- Mirrors the puzzle_generation_logs RLS: super admins can read/write via
-- user-scoped client; the service-role client used by the orchestrator
-- bypasses RLS regardless.
CREATE POLICY "Super admins can read candidate cache"
ON "public"."smart_gen_candidate_cache"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Super admins can insert candidate cache"
ON "public"."smart_gen_candidate_cache"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Super admins can delete candidate cache"
ON "public"."smart_gen_candidate_cache"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);
