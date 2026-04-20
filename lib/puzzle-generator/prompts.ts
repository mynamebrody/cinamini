/**
 * Prompt template resolution.
 *
 * Lookup order for a given game type:
 *   1. The `puzzle_generation_prompts` row with `is_active = true` for this
 *      game type (see 20260417000000_add_puzzle_generation_infra.sql).
 *   2. A hard-coded fallback (mirrors the seed values in that migration so
 *      the generator keeps working even if the row is missing).
 *
 * Variable substitution uses `{{name}}` tokens. Unknown tokens are left in
 * place so the LLM can still see them (it'll just quote them back).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PuzzleGameType } from './types'

export interface ResolvedPromptTemplate {
  id: string | null
  version: number | null
  system: string
  user: string
}

export interface PromptVariables {
  target_date: string
  min_vote_count: string | number
  excluded_ids: string
  [key: string]: string | number
}

interface FallbackTemplate {
  system: string
  user: string
}

/**
 * These mirror the seed rows from 20260417000000_add_puzzle_generation_infra.sql.
 * They exist purely as a defense against a missing/deleted active row.
 *
 * Important: do NOT mention `web_search` here. The orchestrator
 * (lib/puzzle-generator/index.ts → sanitizePrompt) injects a tool-availability
 * note based on the actual `includeWebSearch` flag. Mentioning it inside the
 * template would cause models to ask permission to use a tool that isn't
 * actually available.
 *
 * The JSON shape here matches the `{ candidates: [...] }` shape the strategy
 * appends in `buildSuggestionsPrompt`. (The CandidatesSchema is tolerant of
 * other shapes, but consistency reduces hallucinated formats.)
 */
const FALLBACK_TEMPLATES: Record<PuzzleGameType, FallbackTemplate> = {
  retitled: {
    system:
      'You are a curator for a daily movie puzzle platform called cinamini. ' +
      'You help pick movies for the Retitled game, where players see a foreign-market title ' +
      'and must guess the original English title. ' +
      'You must return strictly valid JSON. Do NOT invent TMDB IDs — only use IDs you are confident exist. ' +
      'Prefer movies that are well-known enough to be solvable but not too mainstream.',
    user:
      'Find 8 candidate movies for a Retitled puzzle on {{target_date}}. ' +
      'Requirements: the film should have at least one non-English / non-US localized title on TMDB ' +
      "whose literal English back-translation is meaningfully different from the movie's original English title. " +
      'Minimum TMDB vote count (films with fewer votes will be ignored): {{min_vote_count}}. ' +
      'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. ' +
      'Return JSON shaped like: {"candidates": [{"id": <TMDB id>, "reasoning": "<one sentence>"}, ...]}.',
  },
  'cast-climb': {
    system:
      'You are a curator for a daily movie puzzle platform called cinamini. ' +
      'You help pick movies for the Cast Climb game, where players see actors revealed one at a time ' +
      '(supporting first, then leads) and must guess the movie. ' +
      'You must return strictly valid JSON. Do NOT invent TMDB IDs — only use IDs you are confident exist.',
    user:
      'Find 8 candidate movies for a Cast Climb puzzle on {{target_date}}. ' +
      'Requirements: the film must have at least 4 credited cast members with recognisable names and TMDB profile photos, ' +
      'and a mix of supporting + lead performances (so progressive reveals feel meaningful). ' +
      'Minimum TMDB vote count (films with fewer votes will be ignored): {{min_vote_count}}. ' +
      'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. ' +
      'Return JSON shaped like: {"candidates": [{"id": <TMDB id>, "reasoning": "<one sentence>"}, ...]}.',
  },
  'poster-pixels': {
    system:
      'You are a curator for a daily movie puzzle platform called cinamini. ' +
      'You help pick movies for the Poster Pixels game, where players see a poster revealed at ' +
      'progressively higher clarity (5%, 15%, 35%, 65%, 100%) and must guess the movie. ' +
      'You must return strictly valid JSON. Do NOT invent TMDB IDs — only use IDs you are confident exist.',
    user:
      'Find 8 candidate movies for a Poster Pixels puzzle on {{target_date}}. ' +
      'Requirements: iconic, recognisable poster art (distinctive silhouettes, typography, or colour palette) that reads well when pixelated. ' +
      'Minimum TMDB vote count (films with fewer votes will be ignored): {{min_vote_count}}. ' +
      'Do NOT suggest any of these TMDB movie IDs (already used): {{excluded_ids}}. ' +
      'Return JSON shaped like: {"candidates": [{"id": <TMDB id>, "reasoning": "<one sentence>"}, ...]}.',
  },
}

/**
 * Load the active prompt template for a game type. Falls back to the
 * hard-coded templates if the DB lookup fails or returns no active row.
 */
export async function loadActivePromptTemplate(
  supabase: SupabaseClient,
  gameType: PuzzleGameType,
): Promise<ResolvedPromptTemplate> {
  try {
    const { data, error } = await supabase
      .from('puzzle_generation_prompts')
      .select('id, version, system_prompt, user_prompt_template')
      .eq('game_type', gameType)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (!error && data) {
      return {
        id: (data as any).id ?? null,
        version: (data as any).version ?? null,
        system: (data as any).system_prompt,
        user: (data as any).user_prompt_template,
      }
    }
  } catch (err) {
    console.warn(
      `[puzzle-generator] failed to load active prompt for ${gameType}:`,
      err,
    )
  }

  const fallback = FALLBACK_TEMPLATES[gameType]
  return {
    id: null,
    version: null,
    system: fallback.system,
    user: fallback.user,
  }
}

/**
 * Replace `{{var}}` tokens in a template string. Unknown tokens are left
 * untouched so the model can still surface them in its output if useful.
 */
export function renderTemplate(
  template: string,
  vars: PromptVariables,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, name) => {
    const value = vars[name as string]
    if (value === undefined || value === null) return match
    return String(value)
  })
}

/**
 * One-shot helper: load + render.
 */
export async function resolvePrompt(
  supabase: SupabaseClient,
  gameType: PuzzleGameType,
  vars: PromptVariables,
): Promise<ResolvedPromptTemplate> {
  const template = await loadActivePromptTemplate(supabase, gameType)
  return {
    id: template.id,
    version: template.version,
    system: renderTemplate(template.system, vars),
    user: renderTemplate(template.user, vars),
  }
}
