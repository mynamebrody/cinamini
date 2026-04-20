-- Swap the deprecated `{{obscurity_threshold}}` prompt variable for
-- `{{min_vote_count}}`. The abstract 1..10 obscurity slider in
-- SmartGenerationDialog was confusing enough that admins could drag it to
-- "2" thinking that meant "lenient" and end up rejecting every blockbuster
-- (threshold 2 on `10 - log10(vote_count)` requires ~100M votes). The new
-- UI exposes a plain "minimum TMDB vote count" number instead, and the
-- prompt templates need to follow suit so the model sees the same knob the
-- admin is actually tuning.
--
-- This is an in-place UPDATE on the active rows. REPLACE() is idempotent,
-- so the migration is safe to re-run and will also catch any historical
-- rows that were edited by admins via /admin/puzzle-prompts.

UPDATE "public"."puzzle_generation_prompts"
SET
    "user_prompt_template" = REPLACE(
        REPLACE(
            "user_prompt_template",
            'Obscurity threshold (1 = blockbuster, 10 = obscure): {{obscurity_threshold}}.',
            'Minimum TMDB vote count (films with fewer votes will be ignored): {{min_vote_count}}.'
        ),
        '{{obscurity_threshold}}',
        '{{min_vote_count}}'
    ),
    "system_prompt" = REPLACE(
        "system_prompt",
        '{{obscurity_threshold}}',
        '{{min_vote_count}}'
    )
WHERE  "user_prompt_template" LIKE '%obscurity_threshold%'
   OR  "system_prompt"        LIKE '%obscurity_threshold%';

-- Keep the table/column comment aligned with the new variable name.
COMMENT ON COLUMN "public"."puzzle_generation_prompts"."user_prompt_template"
    IS 'Mustache-ish template; supported variables are resolved by lib/puzzle-generator/prompts.ts (e.g. {{target_date}}, {{excluded_ids}}, {{min_vote_count}}).';
