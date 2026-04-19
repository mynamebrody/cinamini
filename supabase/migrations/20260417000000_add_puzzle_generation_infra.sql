-- Infrastructure for the smart puzzle generator (issue #55):
--   puzzle_generation_prompts  : admin-editable system/user prompt templates per game
--   puzzle_generation_logs     : one row per Smart Generate invocation (success or failure)
--
-- Both tables are super-admin-only via RLS (mirrors 20250729000000_add_super_admin.sql).
-- Seed inserts at the bottom install a default active template per in-scope game so the
-- generator works immediately after deploy.

-- ----------------------------------------------------------------------------
-- 1. Helper: IS this a game type the generator knows about?
-- ----------------------------------------------------------------------------
-- Game type values mirror the request payload sent by SmartGenerationDialog:
--   'retitled', 'cast-climb', 'poster-pixels'. Budget-bracket is intentionally
--   out of scope for this migration.

-- ----------------------------------------------------------------------------
-- 2. puzzle_generation_prompts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."puzzle_generation_prompts" (
    "id"                   uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    "game_type"            text                    NOT NULL,
    "version"              integer                 NOT NULL DEFAULT 1,
    "system_prompt"        text                    NOT NULL,
    "user_prompt_template" text                    NOT NULL,
    "is_active"            boolean                 NOT NULL DEFAULT false,
    "notes"                text,
    "created_by"           uuid                    REFERENCES auth.users(id) ON DELETE SET NULL,
    "created_at"           timestamptz             NOT NULL DEFAULT now(),
    "updated_at"           timestamptz             NOT NULL DEFAULT now(),
    CONSTRAINT "puzzle_generation_prompts_game_type_check"
        CHECK ("game_type" IN ('retitled', 'cast-climb', 'poster-pixels'))
);

COMMENT ON TABLE  "public"."puzzle_generation_prompts"   IS 'System + user prompt templates used by lib/puzzle-generator. Exactly one row per game_type has is_active = true.';
COMMENT ON COLUMN "public"."puzzle_generation_prompts"."user_prompt_template"
    IS 'Mustache-ish template; supported variables are resolved by lib/puzzle-generator/prompts.ts (e.g. {{target_date}}, {{excluded_ids}}, {{obscurity_threshold}}).';

-- Only one active template per game type.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_puzzle_generation_prompts_one_active"
    ON "public"."puzzle_generation_prompts" ("game_type")
    WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "idx_puzzle_generation_prompts_game_type"
    ON "public"."puzzle_generation_prompts" ("game_type", "version" DESC);

ALTER TABLE "public"."puzzle_generation_prompts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read prompts"
ON "public"."puzzle_generation_prompts"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Super admins can insert prompts"
ON "public"."puzzle_generation_prompts"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

CREATE POLICY "Super admins can update prompts"
ON "public"."puzzle_generation_prompts"
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

CREATE POLICY "Super admins can delete prompts"
ON "public"."puzzle_generation_prompts"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

-- Keep updated_at current.
CREATE OR REPLACE FUNCTION "public"."touch_puzzle_generation_prompts_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_puzzle_generation_prompts_updated_at"
    ON "public"."puzzle_generation_prompts";
CREATE TRIGGER "trg_puzzle_generation_prompts_updated_at"
    BEFORE UPDATE ON "public"."puzzle_generation_prompts"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."touch_puzzle_generation_prompts_updated_at"();

-- ----------------------------------------------------------------------------
-- 3. puzzle_generation_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."puzzle_generation_logs" (
    "id"              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at"      timestamptz NOT NULL DEFAULT now(),
    "admin_user_id"   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    "game_type"       text        NOT NULL,
    "target_date"     date,
    "model"           text,
    "prompt_id"       uuid        REFERENCES "public"."puzzle_generation_prompts"(id) ON DELETE SET NULL,
    "prompt_version"  integer,
    "config"          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    "excluded_count"  integer,
    "candidate_ids"   integer[],
    "final_film_id"   integer,
    "outcome"         text        NOT NULL,
    "duration_ms"     integer,
    "tokens_in"       integer,
    "tokens_out"      integer,
    "error"           text,
    "raw_response"    jsonb,
    CONSTRAINT "puzzle_generation_logs_game_type_check"
        CHECK ("game_type" IN ('retitled', 'cast-climb', 'poster-pixels')),
    CONSTRAINT "puzzle_generation_logs_outcome_check"
        CHECK ("outcome" IN ('success', 'suggestions', 'error'))
);

COMMENT ON TABLE  "public"."puzzle_generation_logs" IS 'One row per Smart Generate invocation. Written by lib/puzzle-generator/logger.ts.';
COMMENT ON COLUMN "public"."puzzle_generation_logs"."outcome"
    IS 'success: a puzzle was returned. suggestions: generator failed, returned fallback TMDB suggestions. error: hard failure.';

CREATE INDEX IF NOT EXISTS "idx_puzzle_generation_logs_created_at"
    ON "public"."puzzle_generation_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_puzzle_generation_logs_game_type"
    ON "public"."puzzle_generation_logs" ("game_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_puzzle_generation_logs_admin"
    ON "public"."puzzle_generation_logs" ("admin_user_id", "created_at" DESC);

ALTER TABLE "public"."puzzle_generation_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read generation logs"
ON "public"."puzzle_generation_logs"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

-- Writes use the service-role client (bypasses RLS) from server-side generator code.
-- We still add an explicit super-admin INSERT policy so that code paths using the
-- user-scoped client (e.g. debug tooling) still work.
CREATE POLICY "Super admins can insert generation logs"
ON "public"."puzzle_generation_logs"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."cinamini_user_profiles"
        WHERE "user_id" = auth.uid()
        AND "is_super_admin" = TRUE
    )
);

-- ----------------------------------------------------------------------------
-- 4. Seed default active prompt per in-scope game
-- ----------------------------------------------------------------------------
INSERT INTO "public"."puzzle_generation_prompts"
    ("game_type", "version", "is_active", "system_prompt", "user_prompt_template", "notes")
VALUES
    (
        'retitled', 1, true,
        'You are a curator for a daily movie puzzle platform called cinamini. '
        || 'You help pick movies for the Retitled game, where players see a foreign-market title '
        || 'and must guess the original English title. '
        || 'You must return strictly valid JSON. Do NOT invent TMDB IDs. '
        || 'Prefer movies that are well-known enough to be solvable but not too mainstream. '
        || 'Use web search to verify localized titles exist and back-translate them.',
        'Find 8 candidate movies for a Retitled puzzle on {{target_date}}. '
        || 'Requirements: the film must have at least one non-English / non-US localized title on TMDB '
        || 'whose literal English back-translation is meaningfully different from the movie''s original English title. '
        || 'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}. '
        || 'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. '
        || 'Return JSON: {"movie_ids": [<number>, ...], "reasoning": "<one sentence>"}.',
        'Seeded default in 20260417000000_add_puzzle_generation_infra.sql'
    ),
    (
        'cast-climb', 1, true,
        'You are a curator for a daily movie puzzle platform called cinamini. '
        || 'You help pick movies for the Cast Climb game, where players see actors revealed one at a time '
        || '(supporting first, then leads) and must guess the movie. '
        || 'You must return strictly valid JSON. Do NOT invent TMDB IDs. '
        || 'Use web search to verify casts and pick ensembles players will enjoy.',
        'Find 8 candidate movies for a Cast Climb puzzle on {{target_date}}. '
        || 'Requirements: the film must have at least 4 credited cast members with recognisable names and TMDB profile photos, '
        || 'and a mix of supporting + lead performances (so progressive reveals feel meaningful). '
        || 'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}. '
        || 'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. '
        || 'Return JSON: {"movie_ids": [<number>, ...], "reasoning": "<one sentence>"}.',
        'Seeded default in 20260417000000_add_puzzle_generation_infra.sql'
    ),
    (
        'poster-pixels', 1, true,
        'You are a curator for a daily movie puzzle platform called cinamini. '
        || 'You help pick movies for the Poster Pixels game, where players see a poster revealed at '
        || 'progressively higher clarity (5%, 15%, 35%, 65%, 100%) and must guess the movie. '
        || 'You must return strictly valid JSON. Do NOT invent TMDB IDs. '
        || 'Use web search to verify poster art is iconic and recognisable even when blurred.',
        'Find 8 candidate movies for a Poster Pixels puzzle on {{target_date}}. '
        || 'Requirements: iconic, recognisable poster art (distinctive silhouettes, typography, or colour palette) that reads well when pixelated. '
        || 'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}. '
        || 'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. '
        || 'Return JSON: {"movie_ids": [<number>, ...], "reasoning": "<one sentence>"}.',
        'Seeded default in 20260417000000_add_puzzle_generation_infra.sql'
    )
ON CONFLICT DO NOTHING;
