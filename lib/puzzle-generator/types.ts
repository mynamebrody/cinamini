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
 * Only `minVoteCount` is surfaced in the current UI; the others exist
 * so future dialog changes or server-side callers (bulk) can override them.
 */
export interface GenerationConfig {
  /**
   * Minimum TMDB `vote_count` a film must have to be eligible. Films with
   * fewer votes are rejected by the eligibility check. Use 0 to disable the
   * filter entirely.
   */
  minVoteCount?: number
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
  // 1,000 votes is "has real traction on TMDB" — admits every household-name
  // film (Godfather ~22k, Jaws ~11k, Inception ~40k) while filtering out
  // student films, regional shorts, and unreleased noise. Admins can lower
  // this to 0 to disable the filter entirely.
  minVoteCount: 1000,
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
  /**
   * Skip the LLM candidate-selection step and force the generator to use
   * exactly this TMDB film id as the winning movie. The rest of the
   * pipeline (localized titles, back-translation, distractor blending,
   * cast selection, poster resolution, etc.) runs unchanged.
   *
   * The generator still respects `excludedFilmIds`: when a forced id is
   * already excluded, the orchestrator short-circuits with an
   * `exclusion_conflict` event instead of calling the strategy.
   *
   * Used by the admin puzzle-editor to auto-generate for a specific film
   * when a user deep-links via `?movieId=<id>`.
   */
  forcedFilmId?: number
  /**
   * How the strategy picks the winning movie when `forcedFilmId` is not set:
   *   - `'auto'` (default): strategy inspects candidates in batches and
   *     short-circuits at the first eligible one — used by bulk callers
   *     and by the `?movieId=<id>` phase-2 build.
   *   - `'manual'`: strategy inspects ALL candidates (no short-circuit),
   *     emits a `candidate-scored` event per candidate, then terminates
   *     with `candidates-ready` and does NOT build a puzzle. The admin
   *     dialog uses this to populate a progressive picker; clicking a
   *     card kicks off a second call with `forcedFilmId` in `'auto'`
   *     mode to build the puzzle.
   *
   * Ignored when `forcedFilmId` is set (there is no candidate list to
   * iterate in that case).
   */
  selectionMode?: 'auto' | 'manual'
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
  /**
   * When set, strategies MUST skip their `streamStructured` LLM
   * candidate-selection step and treat this TMDB id as the sole candidate.
   * The rest of each strategy's pipeline (inspection, distractors, cast
   * selection, poster, schema validation) continues normally.
   *
   * The orchestrator guarantees this id is NOT in `excludedFilmIds` when a
   * strategy's `generate` is invoked.
   */
  forcedFilmId?: number
  /**
   * `'auto'` (default): inspect candidates in batches, short-circuit at
   * the first eligible one, then build the puzzle payload.
   *
   * `'manual'`: inspect every candidate (no short-circuit), emit one
   * `candidate-scored` per attempt, then yield `candidates-ready` and
   * return without building a puzzle. The orchestrator turns that
   * StrategyResult into a terminal `candidates-ready` event so the admin
   * dialog can present a progressive picker.
   *
   * Strategies treat `forcedFilmId` as higher priority: when set, they
   * always run the full single-candidate pipeline regardless of this flag.
   */
  selectionMode: 'auto' | 'manual'
}

/**
 * Per-strategy result shape. A strategy's `generate` either builds and
 * returns a full puzzle (`'success'`) or — in manual-selection mode —
 * returns a list of inspected candidate attempts for the admin to pick
 * from (`'candidates-ready'`).
 */
export type StrategyResult<TPuzzle> =
  | {
      outcome: 'success'
      /** Save-ready puzzle payload matching the `save` route's validator. */
      puzzle: TPuzzle
      /** TMDB ids the model proposed, for logging. */
      candidateIds: number[]
      /**
       * Per-candidate metadata accumulated during generation. Returned on the
       * success path so the admin UI can show the runner-ups (and the "why
       * this movie" reasoning) even after the strategy settled on a winner.
       */
      attempts?: CandidateAttempt[]
      /** Usage from the underlying AI SDK call, for logging. */
      tokensIn?: number
      tokensOut?: number
    }
  | {
      outcome: 'candidates-ready'
      /** Every inspected candidate (accepted + rejected), in model order. */
      attempts: CandidateAttempt[]
      /** TMDB ids the model proposed, for logging. */
      candidateIds: number[]
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
