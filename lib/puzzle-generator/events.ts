/**
 * Event protocol for the streaming puzzle generator.
 *
 * `generatePuzzleStream()` and each strategy's `generate()` async generator
 * yield `GenerationEvent`s as they make progress. The admin dialog turns
 * those into an activity feed; the route layer forwards them as NDJSON lines
 * to the browser.
 *
 * Keep this module dependency-light: it is imported from server code AND
 * shipped to the client for typing the dialog's event handler.
 */

import type { GenerationMeta } from './types'

/**
 * A single candidate movie considered by a strategy, along with any
 * per-candidate metadata the strategy accumulated while deciding whether
 * to use it.
 *
 * We attach these on both the success path (candidates visited on the way
 * to the winner) and the fallback path (no winner found — these become the
 * suggestions shown to the admin).
 */
export interface CandidateAttempt {
  movie: {
    id: number
    title: string
    poster_path: string | null
    release_year: number | null
  }
  /**
   * One-line reasoning from the model for why it picked this film.
   * Populated when the LLM's structured output includes per-candidate
   * reasoning; otherwise undefined.
   */
  reasoning?: string
  /**
   * Retitled only — the strategy's best localized title pick for this
   * candidate (populated even when the candidate was ultimately rejected
   * because we want to show the admin what the model was trying to say).
   */
  localizedTitle?: {
    title: string
    countryCode: string
    countryName: string
    backTranslation: string
    /** 0..1, calculateTitleSimilarity(movie.title, backTranslation). */
    similarity: number
  }
  /** Cast Climb only — first 4 actors the strategy would pick. */
  actors?: Array<{
    id: number
    name: string
    character: string
    profile_path: string | null
    order: number
  }>
  /** Poster Pixels only — resolved poster url the strategy would use. */
  posterUrl?: string
  /** 'accepted' if this candidate won; 'rejected' otherwise. */
  verdict: 'accepted' | 'rejected'
  /** Human-readable reason, e.g. "obscurity too high" or "no title below similarity 0.6". */
  reason?: string
}

/** Alias for clarity at the suggestions boundary. */
export type RichSuggestion = CandidateAttempt

/**
 * Every event the generator can emit during a single `generatePuzzleStream`
 * invocation. Exactly one terminal event (`success`, `suggestions`, `error`,
 * or `aborted`) is emitted, followed by `done`.
 */
export type GenerationEvent =
  | { kind: 'status'; label: string; detail?: string }
  | { kind: 'model-text-delta'; delta: string }
  | { kind: 'tool-call'; name: string }
  | { kind: 'candidates'; ids: number[]; reasoning?: string }
  | { kind: 'candidate-scored'; attempt: CandidateAttempt }
  | {
      kind: 'suggestions'
      suggestions: RichSuggestion[]
      error: string
      meta: GenerationMeta
    }
  | { kind: 'success'; puzzle: unknown; meta: GenerationMeta }
  | {
      kind: 'error'
      error: string
      /**
       * Optional admin-facing diagnostic. For `AIStructuredError` this is a
       * multi-line block containing the Zod issues and a truncated raw-text
       * preview of what the model returned, so an admin can eyeball the
       * failure without tailing server logs.
       */
      detail?: string
      meta?: GenerationMeta
    }
  | { kind: 'aborted' }
  | { kind: 'done' }

/**
 * True when `signal?.aborted` is set. Small helper so strategies can early-
 * return on cancellation without worrying about the signal being undefined.
 */
export function isAborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted)
}
