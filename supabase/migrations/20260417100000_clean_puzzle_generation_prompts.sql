-- Replace the version-1 puzzle generation prompts with version-2 templates that:
--   * Drop the "Use web search to verify…" mandate. The orchestrator
--     (lib/puzzle-generator/index.ts → sanitizePrompt) injects a tool-availability
--     note based on the actual `includeWebSearch` flag at request time. Mentioning
--     web_search inside the template caused gpt-5-mini (with the Grounded toggle
--     OFF) to ASK PERMISSION to use a tool that wasn't available, instead of
--     returning JSON. The model would respond with prose like:
--       "I can do that, but I need to run web lookups to verify TMDB localized
--        titles and back-translations. Do you want me to proceed?"
--     which is then rejected by the JSON parser as "No JSON object found in
--     model output".
--
--   * Align the JSON shape with the strategy's expected `{ candidates: [...] }`
--     instead of the older `{ movie_ids: [...], reasoning }`. The strategies
--     append a clarifying example anyway and CandidatesSchema accepts both,
--     but consistency reduces hallucinated formats.
--
-- Keeps the version-1 rows around (just flips them to is_active = false) so
-- admins can review or restore them from the /admin/puzzle-prompts UI.

-- Step 1: deactivate the existing active rows so the partial unique index
-- (idx_puzzle_generation_prompts_one_active) won't reject the version-2
-- inserts below.
UPDATE "public"."puzzle_generation_prompts"
SET    "is_active" = false
WHERE  "is_active" = true
  AND  "version"   = 1
  AND  "game_type" IN ('retitled', 'cast-climb', 'poster-pixels');

-- Step 2: insert a clean v2 row per game type, marked active. Skip if v2
-- already exists (idempotent for repeated migration runs / dev resets).
INSERT INTO "public"."puzzle_generation_prompts"
    ("game_type", "version", "is_active", "system_prompt", "user_prompt_template", "notes")
SELECT * FROM (
    VALUES
        (
            'retitled', 2, true,
            'You are a curator for a daily movie puzzle platform called cinamini. '
            || 'You help pick movies for the Retitled game, where players see a foreign-market title '
            || 'and must guess the original English title. '
            || 'You must return strictly valid JSON. Do NOT invent TMDB IDs — only use IDs you are confident exist. '
            || 'Prefer movies that are well-known enough to be solvable but not too mainstream.',
            'Find 8 candidate movies for a Retitled puzzle on {{target_date}}. '
            || 'Requirements: the film should have at least one non-English / non-US localized title on TMDB '
            || 'whose literal English back-translation is meaningfully different from the movie''s original English title. '
            || 'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}. '
            || 'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. '
            || 'Return JSON shaped like: {"candidates": [{"id": <TMDB id>, "reasoning": "<one sentence>"}, ...]}.',
            'v2 seeded by 20260417100000_clean_puzzle_generation_prompts.sql — drops the web_search mandate.'
        ),
        (
            'cast-climb', 2, true,
            'You are a curator for a daily movie puzzle platform called cinamini. '
            || 'You help pick movies for the Cast Climb game, where players see actors revealed one at a time '
            || '(supporting first, then leads) and must guess the movie. '
            || 'You must return strictly valid JSON. Do NOT invent TMDB IDs — only use IDs you are confident exist.',
            'Find 8 candidate movies for a Cast Climb puzzle on {{target_date}}. '
            || 'Requirements: the film must have at least 4 credited cast members with recognisable names and TMDB profile photos, '
            || 'and a mix of supporting + lead performances (so progressive reveals feel meaningful). '
            || 'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}. '
            || 'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. '
            || 'Return JSON shaped like: {"candidates": [{"id": <TMDB id>, "reasoning": "<one sentence>"}, ...]}.',
            'v2 seeded by 20260417100000_clean_puzzle_generation_prompts.sql — drops the web_search mandate.'
        ),
        (
            'poster-pixels', 2, true,
            'You are a curator for a daily movie puzzle platform called cinamini. '
            || 'You help pick movies for the Poster Pixels game, where players see a poster revealed at '
            || 'progressively higher clarity (5%, 15%, 35%, 65%, 100%) and must guess the movie. '
            || 'You must return strictly valid JSON. Do NOT invent TMDB IDs — only use IDs you are confident exist.',
            'Find 8 candidate movies for a Poster Pixels puzzle on {{target_date}}. '
            || 'Requirements: iconic, recognisable poster art (distinctive silhouettes, typography, or colour palette) that reads well when pixelated. '
            || 'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}. '
            || 'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. '
            || 'Return JSON shaped like: {"candidates": [{"id": <TMDB id>, "reasoning": "<one sentence>"}, ...]}.',
            'v2 seeded by 20260417100000_clean_puzzle_generation_prompts.sql — drops the web_search mandate.'
        )
) AS new_rows("game_type", "version", "is_active", "system_prompt", "user_prompt_template", "notes")
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."puzzle_generation_prompts" existing
    WHERE existing.game_type = new_rows.game_type
      AND existing.version   = new_rows.version
);
