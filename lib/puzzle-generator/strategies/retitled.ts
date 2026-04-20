/**
 * Retitled strategy.
 *
 * Produces a save-ready payload matching `validateRetitledPuzzle` in
 * `app/api/admin/puzzles/save/route.ts`:
 *
 *   { film_id, film_title, localized_title, country_code, country_name,
 *     distractor_ids[4], translation_note?, english_translation?,
 *     puzzle_date, is_published: false }
 *
 * Key design points (see plan: smart-generator-streaming-cancel):
 *
 *   1. The LLM call streams via `streamStructured` and yields progress events
 *      (text-delta, tool-call, candidates). No web_search by default.
 *   2. Back-translating localized titles used to be the biggest latency
 *      sink. We now back-translate ALL titles for a candidate in parallel
 *      (`Promise.all`) and process candidates themselves in small parallel
 *      batches (`BATCH_SIZE`).
 *   3. On both paths (success OR no-winner) we accumulate per-candidate
 *      `CandidateAttempt`s so the dialog can show the admin the model's
 *      reasoning AND the proposed localized title for each runner-up.
 *   4. Cancellation: every async boundary checks `signal.aborted` and every
 *      outgoing fetch receives `signal`.
 */

import { z } from 'zod'
import { streamStructured } from '@/lib/ai/openai-responses'
import { getMovieById } from '@/lib/tmdb'
import { getBlendedMoviePool } from '@/lib/tmdb-trending'
import {
  SUPPORTED_COUNTRIES,
  calculateTitleSimilarity,
  getCountryName,
  getLocalizedTitles,
  type LocalizedTitle,
  type CountryCode,
} from '@/lib/retitled'
import type { TMDBMovie, TMDBMovieDetails } from '@/lib/types/tmdb'
import type { GenerationEvent, CandidateAttempt } from '../events'
import type { StrategyContext, StrategyResult } from '../types'
import { StrategyNoneEligibleError } from '../types'
import type { PuzzleStrategy, StrategyRunOptions } from './base'
import { describeIneligibility } from '../eligibility'
import { CandidatesSchema } from './candidates-schema'

/** How many candidate movies to process at once. */
const CANDIDATE_BATCH_SIZE = 3

/** Upper bound on candidates the strategy will inspect. */
const MAX_CANDIDATES = 10

const RetitledPuzzleSchema = z.object({
  puzzle_date: z.string(),
  film_id: z.number(),
  film_title: z.string(),
  localized_title: z.string().min(1),
  country_code: z.string().min(2),
  country_name: z.string().min(1),
  distractor_ids: z.array(z.number()).length(4),
  translation_note: z.string().optional(),
  english_translation: z.string().optional(),
  is_published: z.boolean().optional(),
})

export type RetitledPuzzlePayload = z.infer<typeof RetitledPuzzleSchema>

/** Base URL for server-side fetch() calls that need to hit our own API routes. */
function getInternalBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  )
}

/**
 * Back-translate a foreign title to English via POST /api/translate.
 * Passes through the abort signal so an admin cancel kills in-flight calls.
 */
async function backTranslateToEnglish(
  text: string,
  signal: AbortSignal | undefined,
): Promise<string | null> {
  if (!text || text.trim().length === 0) return null
  try {
    const base = getInternalBaseUrl()
    const res = await fetch(`${base}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang: 'en' }),
      signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as { translatedText?: string }
    return json.translatedText?.trim() || null
  } catch (err) {
    if (isAbort(err)) throw err
    console.warn('[puzzle-generator/retitled] translate call failed:', err)
    return null
  }
}

interface ScoredLocalizedTitle {
  title: LocalizedTitle
  backTranslation: string
  similarity: number
}

/**
 * For a candidate movie, fetch alternative titles and back-translate them
 * all in parallel. Returns titles whose back-translation similarity is
 * strictly below `maxSimilarity`, sorted most-distinctive first.
 */
async function scoreLocalizedTitles(
  movie: Pick<TMDBMovie, 'id' | 'title'>,
  maxSimilarity: number,
  signal: AbortSignal | undefined,
): Promise<ScoredLocalizedTitle[]> {
  const localized = await getLocalizedTitles(movie.id)
  const filtered = localized.filter(
    (lt) => lt.title && lt.title.trim().length >= 4 && lt.title !== movie.title,
  )
  if (filtered.length === 0) return []

  const scored = await Promise.all(
    filtered.map(async (candidate) => {
      const backTranslation = await backTranslateToEnglish(
        candidate.title,
        signal,
      )
      if (!backTranslation) return null
      const similarity = calculateTitleSimilarity(movie.title, backTranslation)
      return {
        title: candidate,
        backTranslation,
        similarity,
      } satisfies ScoredLocalizedTitle
    }),
  )

  const accepted = scored.filter(
    (x): x is ScoredLocalizedTitle => !!x && x.similarity < maxSimilarity,
  )
  accepted.sort((a, b) => {
    if (a.similarity !== b.similarity) return a.similarity - b.similarity
    const priorityA =
      SUPPORTED_COUNTRIES[a.title.country_code as CountryCode]?.priority ?? 5
    const priorityB =
      SUPPORTED_COUNTRIES[b.title.country_code as CountryCode]?.priority ?? 5
    return priorityA - priorityB
  })
  return accepted
}

/**
 * Pick 4 TMDB-validated distractors from a blended movie pool, preferring
 * films from the same era and popularity band as the correct answer.
 */
function pickDistractors(
  correct: TMDBMovieDetails,
  pool: TMDBMovie[],
  excludedIds: Set<number>,
): number[] {
  const correctYear = correct.release_date
    ? new Date(correct.release_date).getUTCFullYear()
    : NaN
  const logPopularity = Math.log(Math.max(1, correct.popularity))

  const available = pool.filter(
    (m) =>
      m.id !== correct.id &&
      !excludedIds.has(m.id) &&
      !m.adult &&
      Boolean(m.poster_path),
  )

  const sameEra = Number.isFinite(correctYear)
    ? available.filter((m) => {
        if (!m.release_date) return false
        const y = new Date(m.release_date).getUTCFullYear()
        if (Number.isNaN(y)) return false
        return Math.abs(y - correctYear) <= 10
      })
    : []

  const sameEraSamePopularity = sameEra.filter(
    (m) => Math.abs(Math.log(Math.max(1, m.popularity)) - logPopularity) <= 1.5,
  )

  const layers = [sameEraSamePopularity, sameEra, available]
  const chosen = new Map<number, TMDBMovie>()
  for (const layer of layers) {
    for (const movie of layer) {
      if (chosen.size >= 4) break
      if (!chosen.has(movie.id)) chosen.set(movie.id, movie)
    }
    if (chosen.size >= 4) break
  }

  return Array.from(chosen.values())
    .slice(0, 4)
    .map((m) => m.id)
}

function buildSuggestionsPrompt(userPrompt: string): string {
  return `${userPrompt}

Return JSON exactly like:
{"candidates": [
  {
    "id": <TMDB id of the answer film>,
    "reasoning": "<one short sentence explaining why this film is a good Retitled pick>",
    "distractors": [<TMDB id>, <TMDB id>, <TMDB id>, <TMDB id>]
  },
  ...
]}

Provide between 5 and 10 candidates, ordered from most to least promising.

For each candidate, also propose exactly 4 "distractor" TMDB movie ids to serve as red-herring wrong answers in the multiple-choice prompt. Distractor rules — these are STRICT:
  - They MUST be real TMDB movie ids you are confident exist. Never invent ids.
  - They must NOT equal the answer's id.
  - They must NOT be the same film as the answer (no remakes, no sequels in the same franchise unless that's the only thematic match).
  - Pick films that make plausible mis-guesses for a player skimming the options:
      * similar era (within ~10 years of the answer)
      * similar genre or premise
      * similar prestige level (don't pair an indie with a tentpole blockbuster)
  - Prefer films that themselves have well-known foreign titles, so the distractor doesn't read as obviously "not the right one".`
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
    scored: ScoredLocalizedTitle
    /**
     * TMDB-validated red herrings the model proposed for this candidate.
     * Already filtered to: real TMDB ids, has poster, not adult, not the
     * answer, not in the recency exclusion set. May be fewer than 4 — the
     * caller tops up via `pickDistractors()`.
     */
    modelDistractors: number[]
  }
}

/**
 * Fetch the model's proposed distractor ids in parallel and keep only the
 * ones that:
 *   - resolve to a real TMDB movie
 *   - have a poster
 *   - are not adult
 *   - are not the answer
 *   - are not in the recency exclusion set (we don't want yesterday's
 *     answer showing up as today's red herring)
 */
async function validateModelDistractors(
  proposed: number[] | undefined,
  answer: TMDBMovieDetails,
  ctx: StrategyContext,
  signal: AbortSignal | undefined,
): Promise<number[]> {
  if (!proposed || proposed.length === 0) return []
  const unique = Array.from(
    new Set(proposed.filter((id) => Number.isFinite(id) && id > 0 && id !== answer.id)),
  )
  if (unique.length === 0) return []

  const fetched = await Promise.all(
    unique.map(async (id) => {
      try {
        const m = (await getMovieById(id)) as TMDBMovieDetails | null
        return m
      } catch (err) {
        if (isAbort(err)) throw err
        return null
      }
    }),
  )

  const accepted: number[] = []
  for (let i = 0; i < unique.length; i += 1) {
    const id = unique[i]
    const movie = fetched[i]
    if (!movie) continue
    if (movie.adult) continue
    if (!movie.poster_path) continue
    if (ctx.excludedFilmIds.has(id)) continue
    accepted.push(id)
    if (accepted.length >= 4) break
  }
  return accepted
}

/**
 * Fully score a single candidate: fetch TMDB details, verify eligibility,
 * score localized titles, AND validate the model's proposed distractors
 * in parallel. Returns the attempt (always) and — if the candidate passed
 * — the winning data including the validated distractor ids.
 */
async function inspectCandidate(
  id: number,
  reasoning: string | undefined,
  proposedDistractors: number[] | undefined,
  ctx: StrategyContext,
  signal: AbortSignal | undefined,
): Promise<InspectionResult | null> {
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

  const movieRef = movie
  const [scored, modelDistractors] = await Promise.all([
    scoreLocalizedTitles(
      movieRef,
      ctx.config.retitledMaxBackTranslationSimilarity,
      signal,
    ),
    validateModelDistractors(proposedDistractors, movieRef, ctx, signal),
  ])

  if (scored.length === 0) {
    return {
      attempt: {
        movie: summary,
        reasoning,
        verdict: 'rejected',
        reason: `No localized title below similarity ${ctx.config.retitledMaxBackTranslationSimilarity.toFixed(2)} to the English title`,
      },
    }
  }

  const best = scored[0]
  return {
    attempt: {
      movie: summary,
      reasoning,
      localizedTitle: {
        title: best.title.title,
        countryCode: best.title.country_code,
        countryName:
          best.title.country_name ||
          getCountryName(best.title.country_code) ||
          best.title.country_code,
        backTranslation: best.backTranslation,
        similarity: best.similarity,
      },
      verdict: 'accepted',
    },
    winner: { movie, scored: best, modelDistractors },
  }
}

export const retitledStrategy: PuzzleStrategy<RetitledPuzzlePayload> = {
  gameType: 'retitled',
  outputSchema: RetitledPuzzleSchema,

  async *generate(
    ctx: StrategyContext,
    { signal }: StrategyRunOptions,
  ): AsyncGenerator<GenerationEvent, StrategyResult<RetitledPuzzlePayload>, unknown> {
    let tokensIn: number | undefined
    let tokensOut: number | undefined
    let modelCandidates: Array<{
      id: number
      reasoning?: string
      distractorIds?: number[]
    }> = []

    if (typeof ctx.forcedFilmId === 'number') {
      // Admin deep-linked with `?movieId=<id>`: skip the LLM candidate step
      // entirely and treat the forced id as the sole candidate. The rest of
      // the pipeline (localized title scoring, distractor blending, schema
      // validation) runs unchanged, and the existing pool-based
      // `pickDistractors` fallback fills all 4 red herrings.
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
    // Manual picker mode: inspect every candidate (no short-circuit) and
    // hand the attempts to the admin dialog to choose from. Forced ids
    // always run the full single-candidate pipeline regardless.
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
        'Model returned no candidates for Retitled.',
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
      detail: `Inspecting ${candidateIds.length} candidate(s) in parallel batches of ${CANDIDATE_BATCH_SIZE}`,
    }

    const pool = await getBlendedMoviePool(0.3, 80).catch(() => [])

    const attempts: CandidateAttempt[] = []
    let winner: InspectionResult['winner'] | null = null

    for (let i = 0; i < modelCandidates.length; i += CANDIDATE_BATCH_SIZE) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (!manualMode && winner) break

      const batch = modelCandidates.slice(i, i + CANDIDATE_BATCH_SIZE)
      const results = await Promise.all(
        batch.map((c) =>
          inspectCandidate(c.id, c.reasoning, c.distractorIds, ctx, signal),
        ),
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
        'No Retitled candidate produced a distinct-enough localized title within the eligibility rules.',
        candidateIds,
        tokensIn,
        tokensOut,
        attempts,
      )
    }

    // Distractor blending — use what the model proposed first, then top up
    // from the era/popularity-matched TMDB pool to guarantee exactly 4.
    // Every id ultimately written to `distractor_ids` has been TMDB-validated
    // (model picks via `validateModelDistractors`, pool picks via the
    // `getBlendedMoviePool` lookup itself).
    const distractorIds: number[] = []
    const distractorSeen = new Set<number>([winner.movie.id])
    for (const id of winner.modelDistractors) {
      if (distractorIds.length >= 4) break
      if (distractorSeen.has(id)) continue
      distractorIds.push(id)
      distractorSeen.add(id)
    }
    if (distractorIds.length < 4) {
      const poolPicks = pickDistractors(winner.movie, pool, ctx.excludedFilmIds)
      for (const id of poolPicks) {
        if (distractorIds.length >= 4) break
        if (distractorSeen.has(id)) continue
        distractorIds.push(id)
        distractorSeen.add(id)
      }
    }
    if (distractorIds.length < 4) {
      throw new StrategyNoneEligibleError(
        'Winning Retitled candidate could not be paired with 4 era-appropriate distractors (model proposed ' +
          `${winner.modelDistractors.length} valid red herring(s) and the TMDB pool topped up to ` +
          `${distractorIds.length}, still under the required 4).`,
        candidateIds,
        tokensIn,
        tokensOut,
        attempts,
      )
    }

    const payload: RetitledPuzzlePayload = {
      puzzle_date: ctx.targetDate,
      film_id: winner.movie.id,
      film_title: winner.movie.title,
      localized_title: winner.scored.title.title,
      country_code: winner.scored.title.country_code,
      country_name:
        winner.scored.title.country_name ||
        getCountryName(winner.scored.title.country_code) ||
        winner.scored.title.country_code,
      distractor_ids: distractorIds,
      // Intentionally omitted — the editor auto-fetches a fun fact
      // after smart-gen succeeds and uses its first entry as the
      // translation note. A canned "takes a different approach"
      // phrase would otherwise linger because the functional
      // setState guard in the editor preserves the first non-empty
      // value.
      translation_note: undefined,
      english_translation: winner.scored.backTranslation,
      is_published: false,
    }

    const parsed = RetitledPuzzleSchema.safeParse(payload)
    if (!parsed.success) {
      throw new StrategyNoneEligibleError(
        'Constructed Retitled payload failed schema validation.',
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
