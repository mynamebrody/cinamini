/**
 * Public types for the smart puzzle generator.
 *
 * This module is the single source of truth for the contract between:
 *   - the `POST /api/admin/puzzles/generate` route
 *   - per-game strategies (retitled, cast-climb, poster-pixels)
 *   - `SmartGenerationDialog` on the admin side
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateAttempt, RichSuggestion } from './events'

/** Game types this generator supports. Budget-bracket is intentionally omitted. */
export type PuzzleGameType = 'retitled' | 'cast-climb' | 'poster-pixels'

export const SUPPORTED_GAME_TYPES: readonly PuzzleGameType[] = [
  'retitled',
  'cast-climb',
  'poster-pixels',
] as const

/**
 * Caller-tunable knobs. Populated from `SmartGenerationDialog` state.
 *
 * Only `obscurityThreshold` is surfaced in the current UI; the others exist
 * so future dialog changes or server-side callers (bulk) can override them.
 */
export interface GenerationConfig {
  /**
   * 1 = mainstream blockbusters only, 10 = very obscure films.
   * The eligibility check rejects any candidate whose computed obscurity
   * score exceeds this threshold.
   */
  obscurityThreshold?: number
  /**
   * How many days back the "used in any game" exclusion window extends.
   * Defaults to 30 per issue #55 and must stay >= 30 to satisfy the rule.
   */
  avoidRecentDays?: number
  /**
   * Retitled-only: reject foreign titles whose English back-translation is
   * this similar (0..1) or more to the movie's English title. Defaults to
   * 0.6 — anything higher tends to be trivial transliteration.
   */
  retitledMaxBackTranslationSimilarity?: number
}

export const DEFAULT_GENERATION_CONFIG: Required<GenerationConfig> = {
  // The score formula is `10 - log10(vote_count)`; a threshold of 7 admits
  // films with vote_count >= 1,000 (effectively "anything with traction on
  // TMDB"). Anything stricter rejects household-name films like Inception
  // and Star Wars, which led to admins seeing every smart-gen candidate
  // marked "rejected" with no way through.
  obscurityThreshold: 7,
  avoidRecentDays: 30,
  retitledMaxBackTranslationSimilarity: 0.6,
}

/** Request shape accepted by `generatePuzzle()`. */
export interface GenerationRequest {
  gameType: PuzzleGameType
  targetDate: string // YYYY-MM-DD
  config?: GenerationConfig
  /** Optional admin user id, written into puzzle_generation_logs. */
  adminUserId?: string
  /**
   * Extra TMDB movie ids to exclude beyond the DB-driven exclusion set.
   * Bulk callers use this to accumulate exclusions across a batch.
   */
  extraExclusions?: number[]
  /**
   * Optional explicit model override. Otherwise resolved from env.
   */
  modelOverride?: string
  /**
   * Opt-in to OpenAI's hosted `web_search` tool. Off by default because it
   * makes every call 30-90 seconds slower. Turn it on when fresh citations
   * matter (admin "Grounded" toggle).
   */
  includeWebSearch?: boolean
}

/** Result returned to the caller. */
export type GenerationResult<TPuzzle = unknown> =
  | {
      outcome: 'success'
      puzzle: TPuzzle
      meta: GenerationMeta
    }
  | {
      outcome: 'suggestions'
      error: string
      suggestions: RichSuggestion[]
      meta: GenerationMeta
    }
  | {
      outcome: 'error'
      error: string
      /** Optional admin-facing diagnostic (Zod issues + raw model output preview). */
      detail?: string
      meta: GenerationMeta
    }
  | {
      outcome: 'aborted'
      meta: GenerationMeta
    }

export interface GenerationMeta {
  gameType: PuzzleGameType
  targetDate: string
  modelId: string
  promptId: string | null
  promptVersion: number | null
  excludedCount: number
  candidateIds: number[]
  finalFilmId: number | null
  durationMs: number
  tokensIn?: number
  tokensOut?: number
}

/**
 * Everything a `PuzzleStrategy.generate` implementation receives to do its job.
 */
export interface StrategyContext {
  gameType: PuzzleGameType
  targetDate: string
  /** Fully-merged config with defaults applied. */
  config: Required<GenerationConfig>
  /**
   * TMDB movie ids the strategy must NOT propose as the winning puzzle movie.
   * Already includes:
   *   - every film_id ever used in this game
   *   - every film_id used in any game in the last `avoidRecentDays`
   *   - the caller's `extraExclusions`
   */
  excludedFilmIds: Set<number>
  /**
   * Server-side supabase client (service role). Strategies should use this
   * only for read-only lookups if they need history beyond the exclusion set.
   */
  supabase: SupabaseClient
  /**
   * Resolved prompt template from DB (or default) — already variable-substituted.
   */
  prompt: {
    id: string | null
    version: number | null
    system: string
    user: string
  }
  /**
   * Model id to pass through to `generateStructured` / `streamStructured`.
   */
  modelId: string
  /**
   * Whether to enable OpenAI's `web_search` tool during model calls. Defaults
   * to false at the generator level; strategies may still force it on when a
   * step genuinely requires grounded citations.
   */
  includeWebSearch: boolean
}

/** Per-strategy result shape. */
export interface StrategyResult<TPuzzle> {
  /** Save-ready puzzle payload matching the `save` route's validator. */
  puzzle: TPuzzle
  /** TMDB ids the model proposed, for logging. */
  candidateIds: number[]
  /**
   * Per-candidate metadata accumulated during generation. Returned on the
   * success path so the admin UI can show the runner-ups (and the "why this
   * movie" reasoning) even after the strategy settled on a winner.
   */
  attempts?: CandidateAttempt[]
  /** Usage from the underlying AI SDK call, for logging. */
  tokensIn?: number
  tokensOut?: number
}

/**
 * Strategies may throw `StrategyNoneEligibleError` to signal the route should
 * return fallback suggestions rather than a hard error. When `attempts` is
 * populated, the dialog presents them as rich suggestion cards.
 */
export class StrategyNoneEligibleError extends Error {
  constructor(
    message: string,
    public readonly candidateIds: number[] = [],
    public readonly tokensIn?: number,
    public readonly tokensOut?: number,
    public readonly attempts: CandidateAttempt[] = [],
  ) {
    super(message)
    this.name = 'StrategyNoneEligibleError'
  }
}
