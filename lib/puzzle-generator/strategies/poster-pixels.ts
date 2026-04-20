/**
 * Poster Pixels strategy.
 *
 * Produces a save-ready payload matching `validatePosterPixelsPuzzle` in
 * `app/api/admin/puzzles/save/route.ts`:
 *
 *   { film_id, film_title, film_poster_url, film_release_year, seed_value,
 *     puzzle_date, is_published: false }
 *
 * The editor (components/admin/puzzle-editor/poster-pixels-editor.tsx)
 * generates its own seed on save, but populating one up-front keeps the
 * payload valid against the save route's checker either way.
 *
 * Streaming + cancellation + parallelism pattern mirrors the Retitled
 * strategy — see that file for detailed comments.
 */

import { z } from 'zod'
import { streamStructured } from '@/lib/ai/openai-responses'
import { getMovieById, getPosterUrl } from '@/lib/tmdb'
import { generateDailySeed } from '@/lib/game-seeding'
import type { TMDBMovieDetails } from '@/lib/types/tmdb'
import type { GenerationEvent, CandidateAttempt } from '../events'
import type { StrategyContext, StrategyResult } from '../types'
import { StrategyNoneEligibleError } from '../types'
import type { PuzzleStrategy, StrategyRunOptions } from './base'
import { describeIneligibility } from '../eligibility'
import { CandidatesSchema } from './candidates-schema'

const CANDIDATE_BATCH_SIZE = 4
const MAX_CANDIDATES = 12

const PosterPixelsPuzzleSchema = z.object({
  puzzle_date: z.string(),
  film_id: z.number(),
  film_title: z.string(),
  film_poster_url: z.string().min(1),
  film_release_year: z.number(),
  seed_value: z.string().min(1),
  is_published: z.boolean().optional(),
})

export type PosterPixelsPuzzlePayload = z.infer<typeof PosterPixelsPuzzleSchema>

function buildSuggestionsPrompt(userPrompt: string): string {
  return `${userPrompt}

Return JSON exactly like:
{"candidates": [{"id": <TMDB id>, "reasoning": "<one short sentence explaining why this film's poster is iconic enough for Poster Pixels>"}, ...]}

Provide between 5 and 10 candidates, ordered from most to least promising.`
}

function toMovieSummary(movie: TMDBMovieDetails): CandidateAttempt['movie'] {
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getUTCFullYear()
    : null
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
    release_year: Number.isFinite(releaseYear ?? NaN) ? releaseYear : null,
  }
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  return name === 'AbortError'
}

interface InspectionResult {
  attempt: CandidateAttempt
  winner?: {
    movie: TMDBMovieDetails
    posterUrl: string
    releaseYear: number
  }
}

async function inspectCandidate(
  id: number,
  reasoning: string | undefined,
  ctx: StrategyContext,
  signal: AbortSignal | undefined,
): Promise<InspectionResult | null> {
  void signal
  if (ctx.excludedFilmIds.has(id)) return null
  let movie: TMDBMovieDetails | null = null
  try {
    movie = (await getMovieById(id)) as TMDBMovieDetails | null
  } catch (err) {
    if (isAbort(err)) throw err
  }
  if (!movie) return null

  const summary = toMovieSummary(movie)
  const ineligibilityReason = describeIneligibility(movie, {
    minVoteCount: ctx.config.minVoteCount,
  })
  if (ineligibilityReason !== null) {
    return {
      attempt: {
        movie: summary,
        reasoning,
        verdict: 'rejected',
        reason: ineligibilityReason,
      },
    }
  }

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getUTCFullYear()
    : NaN
  if (!Number.isFinite(releaseYear)) {
    return {
      attempt: {
        movie: summary,
        reasoning,
        verdict: 'rejected',
        reason: 'Missing / unparseable release year',
      },
    }
  }

  const posterUrl = getPosterUrl(movie.poster_path, 'w500')
  if (!posterUrl) {
    return {
      attempt: {
        movie: summary,
        reasoning,
        verdict: 'rejected',
        reason: 'Could not resolve poster URL',
      },
    }
  }

  return {
    attempt: {
      movie: summary,
      reasoning,
      posterUrl,
      verdict: 'accepted',
    },
    winner: { movie, posterUrl, releaseYear },
  }
}

export const posterPixelsStrategy: PuzzleStrategy<PosterPixelsPuzzlePayload> = {
  gameType: 'poster-pixels',
  outputSchema: PosterPixelsPuzzleSchema,

  async *generate(
    ctx: StrategyContext,
    { signal }: StrategyRunOptions,
  ): AsyncGenerator<GenerationEvent, StrategyResult<PosterPixelsPuzzlePayload>, unknown> {
    let tokensIn: number | undefined
    let tokensOut: number | undefined
    let modelCandidates: Array<{ id: number; reasoning?: string }> = []

    if (typeof ctx.forcedFilmId === 'number') {
      // Admin deep-linked with `?movieId=<id>`: skip the LLM candidate step
      // entirely and treat the forced id as the sole candidate. The poster
      // URL / release year / seed generation downstream continues normally.
      modelCandidates = [
        {
          id: ctx.forcedFilmId,
          reasoning: 'Admin forced this film via URL',
        },
      ]
    } else {
      for await (const ev of streamStructured({
        schema: CandidatesSchema,
        system: ctx.prompt.system,
        prompt: buildSuggestionsPrompt(ctx.prompt.user),
        modelId: ctx.modelId,
        includeWebSearch: ctx.includeWebSearch,
        abortSignal: signal,
      })) {
        if (ev.kind === 'text-delta') {
          yield { kind: 'model-text-delta', delta: ev.delta }
        } else if (ev.kind === 'tool-call') {
          yield { kind: 'tool-call', name: ev.name }
        } else if (ev.kind === 'final') {
          tokensIn = ev.result.usage.tokensIn
          tokensOut = ev.result.usage.tokensOut
          modelCandidates = ev.result.object
        } else if (ev.kind === 'error') {
          throw ev.error
        }
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    modelCandidates = modelCandidates.slice(0, MAX_CANDIDATES)
    const candidateIds = modelCandidates.map((c) => c.id)
    const manualMode =
      ctx.selectionMode === 'manual' && typeof ctx.forcedFilmId !== 'number'
    yield {
      kind: 'candidates',
      ids: candidateIds,
      reasoning: modelCandidates[0]?.reasoning,
      items: modelCandidates.map((c) => ({ id: c.id, reasoning: c.reasoning })),
    }

    if (candidateIds.length === 0) {
      throw new StrategyNoneEligibleError(
        'Model returned no candidates for Poster Pixels.',
        [],
        tokensIn,
        tokensOut,
        [],
      )
    }

    yield {
      kind: 'status',
      label: manualMode
        ? 'Inspecting all candidates'
        : 'Scoring candidates',
      detail: `Checking posters for ${candidateIds.length} candidate(s)`,
    }

    const attempts: CandidateAttempt[] = []
    let winner: InspectionResult['winner'] | null = null

    for (let i = 0; i < modelCandidates.length; i += CANDIDATE_BATCH_SIZE) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (!manualMode && winner) break

      const batch = modelCandidates.slice(i, i + CANDIDATE_BATCH_SIZE)
      const results = await Promise.all(
        batch.map((c) => inspectCandidate(c.id, c.reasoning, ctx, signal)),
      )

      for (const result of results) {
        if (!result) continue
        attempts.push(result.attempt)
        yield { kind: 'candidate-scored', attempt: result.attempt }
        if (!winner && result.winner) {
          winner = result.winner
        }
      }
    }

    if (manualMode) {
      return {
        outcome: 'candidates-ready',
        attempts,
        candidateIds,
        tokensIn,
        tokensOut,
      }
    }

    if (!winner) {
      throw new StrategyNoneEligibleError(
        'No Poster Pixels candidate had an iconic-enough poster within the eligibility rules.',
        candidateIds,
        tokensIn,
        tokensOut,
        attempts,
      )
    }

    const targetDateObj = new Date(`${ctx.targetDate}T00:00:00Z`)
    const seed = Number.isNaN(targetDateObj.getTime())
      ? generateDailySeed(new Date(), { gameId: 'poster-pixels' })
      : generateDailySeed(targetDateObj, { gameId: 'poster-pixels' })

    const payload: PosterPixelsPuzzlePayload = {
      puzzle_date: ctx.targetDate,
      film_id: winner.movie.id,
      film_title: winner.movie.title,
      film_poster_url: winner.posterUrl,
      film_release_year: winner.releaseYear,
      seed_value: seed,
      is_published: false,
    }

    const parsed = PosterPixelsPuzzleSchema.safeParse(payload)
    if (!parsed.success) {
      throw new StrategyNoneEligibleError(
        'Constructed Poster Pixels payload failed schema validation.',
        candidateIds,
        tokensIn,
        tokensOut,
        attempts,
      )
    }

    return {
      outcome: 'success',
      puzzle: parsed.data,
      candidateIds,
      attempts,
      tokensIn,
      tokensOut,
    }
  },
}
