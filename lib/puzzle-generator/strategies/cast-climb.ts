/**
 * Cast Climb strategy.
 *
 * Produces a save-ready payload matching `validateCastClimbPuzzle` in
 * `app/api/admin/puzzles/save/route.ts`:
 *
 *   { film_id, film_title, film_poster_url, film_release_year,
 *     actors[4]: { id, name, character, profile_path, order },
 *     fun_fact?, puzzle_date, is_published: false }
 *
 * The cast-climb editor's `handleSmartGeneration` populates the editor
 * directly from `puzzleData.actors`; the editor then lets the admin drag to
 * reorder. We therefore want the 4 actors the strategy returns to already
 * be in the "supporting first, leads last" order the game uses in play.
 *
 * Streaming + cancellation + parallelism are the same pattern as the
 * Retitled strategy — see that file for detailed comments.
 */

import { z } from 'zod'
import { streamStructured } from '@/lib/ai/openai-responses'
import { getMovieById, getMovieCredits, getPosterUrl } from '@/lib/tmdb'
import type { TMDBCast, TMDBMovieDetails } from '@/lib/types/tmdb'
import { CAST_CLIMB_CONFIG } from '@/lib/cast-climb'
import type { GenerationEvent, CandidateAttempt } from '../events'
import type { StrategyContext, StrategyResult } from '../types'
import { StrategyNoneEligibleError } from '../types'
import type { PuzzleStrategy, StrategyRunOptions } from './base'
import { describeIneligibility } from '../eligibility'
import { CandidatesSchema } from './candidates-schema'

const CANDIDATE_BATCH_SIZE = 4
const MAX_CANDIDATES = 12

const CastClimbActorSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  character: z.string(),
  profile_path: z.string().nullable(),
  order: z.number(),
})

const CastClimbPuzzleSchema = z.object({
  puzzle_date: z.string(),
  film_id: z.number(),
  film_title: z.string(),
  film_poster_url: z.string().nullable(),
  film_release_year: z.number(),
  actors: z.array(CastClimbActorSchema).length(CAST_CLIMB_CONFIG.ACTORS_TO_SHOW),
  fun_fact: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
})

export type CastClimbPuzzlePayload = z.infer<typeof CastClimbPuzzleSchema>

function buildSuggestionsPrompt(userPrompt: string): string {
  return `${userPrompt}

Return JSON exactly like:
{"candidates": [{"id": <TMDB id>, "reasoning": "<one short sentence explaining why this film's ensemble cast fits Cast Climb>"}, ...]}

Provide between 5 and 10 candidates, ordered from most to least promising.`
}

/**
 * Pick 4 actors with `profile_path` from the credited cast, prioritising
 * recognisable billed performances. Result is ordered supporting-first so
 * the game reveals supporting actors before leads.
 */
function selectActors(cast: TMDBCast[]): TMDBCast[] {
  const eligible = cast
    .filter(
      (actor) =>
        actor.name &&
        actor.profile_path &&
        typeof actor.order === 'number' &&
        actor.order < 20,
    )
    .sort((a, b) => a.order - b.order)
  if (eligible.length < CAST_CLIMB_CONFIG.ACTORS_TO_SHOW) return []
  const top = eligible.slice(0, CAST_CLIMB_CONFIG.ACTORS_TO_SHOW)
  return [...top].reverse()
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

function toActorList(cast: TMDBCast[]): CandidateAttempt['actors'] {
  return cast.map((actor) => ({
    id: actor.id,
    name: actor.name,
    character: actor.character ?? '',
    profile_path: actor.profile_path ?? null,
    order: actor.order,
  }))
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
    actors: TMDBCast[]
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
    threshold: ctx.config.obscurityThreshold,
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

  let credits: Awaited<ReturnType<typeof getMovieCredits>> = null
  try {
    credits = await getMovieCredits(id)
  } catch (err) {
    if (isAbort(err)) throw err
  }
  if (!credits || credits.cast.length < CAST_CLIMB_CONFIG.MIN_CAST_SIZE) {
    return {
      attempt: {
        movie: summary,
        reasoning,
        verdict: 'rejected',
        reason: `Cast has fewer than ${CAST_CLIMB_CONFIG.MIN_CAST_SIZE} billed actors`,
      },
    }
  }

  const actors = selectActors(credits.cast)
  if (actors.length !== CAST_CLIMB_CONFIG.ACTORS_TO_SHOW) {
    return {
      attempt: {
        movie: summary,
        reasoning,
        verdict: 'rejected',
        reason: `Fewer than ${CAST_CLIMB_CONFIG.ACTORS_TO_SHOW} billed actors have profile photos`,
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

  return {
    attempt: {
      movie: summary,
      reasoning,
      actors: toActorList(actors),
      verdict: 'accepted',
    },
    winner: { movie, actors, releaseYear },
  }
}

export const castClimbStrategy: PuzzleStrategy<CastClimbPuzzlePayload> = {
  gameType: 'cast-climb',
  outputSchema: CastClimbPuzzleSchema,

  async *generate(
    ctx: StrategyContext,
    { signal }: StrategyRunOptions,
  ): AsyncGenerator<GenerationEvent, StrategyResult<CastClimbPuzzlePayload>, unknown> {
    let tokensIn: number | undefined
    let tokensOut: number | undefined
    let modelCandidates: Array<{ id: number; reasoning?: string }> = []

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

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    modelCandidates = modelCandidates.slice(0, MAX_CANDIDATES)
    const candidateIds = modelCandidates.map((c) => c.id)
    yield {
      kind: 'candidates',
      ids: candidateIds,
      reasoning: modelCandidates[0]?.reasoning,
    }

    if (candidateIds.length === 0) {
      throw new StrategyNoneEligibleError(
        'Model returned no candidates for Cast Climb.',
        [],
        tokensIn,
        tokensOut,
        [],
      )
    }

    yield {
      kind: 'status',
      label: 'Scoring candidates',
      detail: `Checking ensemble casts for ${candidateIds.length} candidate(s)`,
    }

    const attempts: CandidateAttempt[] = []
    let winner: InspectionResult['winner'] | null = null

    for (let i = 0; i < modelCandidates.length; i += CANDIDATE_BATCH_SIZE) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (winner) break

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

    if (!winner) {
      throw new StrategyNoneEligibleError(
        'No Cast Climb candidate had a usable ensemble cast within the eligibility rules.',
        candidateIds,
        tokensIn,
        tokensOut,
        attempts,
      )
    }

    const payload: CastClimbPuzzlePayload = {
      puzzle_date: ctx.targetDate,
      film_id: winner.movie.id,
      film_title: winner.movie.title,
      film_poster_url: getPosterUrl(winner.movie.poster_path, 'w500'),
      film_release_year: winner.releaseYear,
      actors: winner.actors.map((actor) => ({
        id: actor.id,
        name: actor.name,
        character: actor.character ?? '',
        profile_path: actor.profile_path,
        order: actor.order,
      })),
      fun_fact: null,
      is_published: false,
    }

    const parsed = CastClimbPuzzleSchema.safeParse(payload)
    if (!parsed.success) {
      throw new StrategyNoneEligibleError(
        'Constructed Cast Climb payload failed schema validation.',
        candidateIds,
        tokensIn,
        tokensOut,
        attempts,
      )
    }

    return {
      puzzle: parsed.data,
      candidateIds,
      attempts,
      tokensIn,
      tokensOut,
    }
  },
}
