/**
 * Base strategy interface every per-game strategy implements.
 *
 * Strategies are async generators: they yield `GenerationEvent`s as they
 * make progress, and `return` a `StrategyResult<TPuzzle>` when they succeed.
 * `lib/puzzle-generator/index.ts::generatePuzzleStream` drives the generator
 * and forwards its events to the HTTP layer.
 *
 * If the strategy exhausts all candidates without a winner, it throws
 * `StrategyNoneEligibleError` carrying the `CandidateAttempt[]` it
 * accumulated along the way (used by the admin UI to offer rich suggestions).
 */

import type { z } from 'zod'
import type { GenerationEvent } from '../events'
import type {
  PuzzleGameType,
  StrategyContext,
  StrategyResult,
} from '../types'

export interface StrategyRunOptions {
  /** Aborts propagate to the underlying OpenAI and TMDB fetches. */
  signal?: AbortSignal
}

export interface PuzzleStrategy<TPuzzle> {
  gameType: PuzzleGameType
  /**
   * Zod schema used to validate the save-ready puzzle payload before the
   * strategy returns. Also used for downstream type inference.
   */
  outputSchema: z.ZodType<TPuzzle>
  /**
   * Produce a save-ready puzzle. Yields progress events; returns the winning
   * `StrategyResult`. May throw `StrategyNoneEligibleError` if the model +
   * eligibility filters find no acceptable candidate.
   */
  generate(
    ctx: StrategyContext,
    options: StrategyRunOptions,
  ): AsyncGenerator<GenerationEvent, StrategyResult<TPuzzle>, unknown>
}
