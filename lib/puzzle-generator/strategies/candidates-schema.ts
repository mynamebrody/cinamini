/**
 * Shared Zod schema for the "give me candidate movie ids" step of every
 * per-game strategy.
 *
 * GPT-5 mini does not reliably honor a single rigid shape — depending on the
 * prompt it will return any of:
 *
 *   { "candidates": [{ "id": 123, "reasoning": "..." }, ...] }
 *   { "candidates": [123, 456, 789] }
 *   { "candidates": [{ "tmdb_id": 123 }, ...] }
 *   { "movie_ids": [123, 456], "reasoning": "..." }
 *   { "movies": [{ "id": 123, "reasoning": "..." }] }
 *   { "results": [...] }
 *   [ 123, 456, 789 ]
 *   [ { "id": 123, "reasoning": "..." }, ...]
 *
 * Rather than hand-tuning the prompt for every run, we accept all of the
 * above and normalize to `Array<{ id: number; reasoning?: string }>`.
 *
 * Common reasoning keys (`reason`, `why`, `note`) are also accepted so a
 * small LLM drift doesn't invalidate a whole generation.
 */

import { z } from 'zod'

/** Normalized candidate shape consumed by every strategy. */
export interface ModelCandidate {
  id: number
  reasoning?: string
  /**
   * Optional 4-ish list of red-herring TMDB ids the model proposed alongside
   * this candidate. Strategies that need wrong-answer choices (currently:
   * Retitled) consume this; strategies that don't (Cast Climb, Poster
   * Pixels) ignore it. Always validated against TMDB by the strategy
   * BEFORE being shown to the admin or saved.
   */
  distractorIds?: number[]
}

/**
 * Coerce a heterogenous "list of ids" value (string, number, or array of
 * either) into a clean number[]. Drops anything that doesn't look like a
 * positive integer. Returns undefined when nothing usable survives so
 * downstream consumers can distinguish "model gave nothing" from "model gave
 * an empty array".
 */
function coerceIdList(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: number[] = []
  const seen = new Set<number>()
  for (const item of value) {
    let id: number
    if (typeof item === 'number') {
      id = item
    } else if (typeof item === 'string') {
      id = Number.parseInt(item, 10)
    } else if (
      item &&
      typeof item === 'object' &&
      typeof (item as { id?: unknown }).id !== 'undefined'
    ) {
      const raw = (item as { id: unknown }).id
      id =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string'
            ? Number.parseInt(raw, 10)
            : NaN
    } else {
      continue
    }
    if (!Number.isFinite(id) || id <= 0) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out.length > 0 ? out : undefined
}

const ItemObject = z
  .looseObject({
    id: z.union([z.number(), z.string()]).optional(),
    tmdb_id: z.union([z.number(), z.string()]).optional(),
    movie_id: z.union([z.number(), z.string()]).optional(),
    reasoning: z.string().optional(),
    reason: z.string().optional(),
    why: z.string().optional(),
    note: z.string().optional(),
    // Common shapes for red-herring ids the model may emit.
    distractors: z.array(z.unknown()).optional(),
    distractor_ids: z.array(z.unknown()).optional(),
    wrong_answers: z.array(z.unknown()).optional(),
    red_herrings: z.array(z.unknown()).optional(),
  })
  .transform((raw, ctx) => {
    const idLike = raw.id ?? raw.tmdb_id ?? raw.movie_id
    const id =
      typeof idLike === 'number'
        ? idLike
        : typeof idLike === 'string'
          ? Number.parseInt(idLike, 10)
          : NaN
    if (!Number.isFinite(id) || id <= 0) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Item missing a numeric "id" / "tmdb_id" / "movie_id" field',
      })
      return z.NEVER
    }
    const reasoning = raw.reasoning ?? raw.reason ?? raw.why ?? raw.note
    const distractorIds =
      coerceIdList(raw.distractors) ??
      coerceIdList(raw.distractor_ids) ??
      coerceIdList(raw.wrong_answers) ??
      coerceIdList(raw.red_herrings)
    return {
      id,
      reasoning: typeof reasoning === 'string' ? reasoning : undefined,
      distractorIds: distractorIds?.filter((d) => d !== id),
    } as ModelCandidate
  })

/** A single candidate can be either a bare number or the rich object above. */
const Item = z.union([
  z.number().transform((id): ModelCandidate => ({ id })),
  z
    .string()
    .transform((raw, ctx): ModelCandidate => {
      const id = Number.parseInt(raw, 10)
      if (!Number.isFinite(id) || id <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: `Expected a numeric TMDB id, got "${raw}"`,
        })
        return z.NEVER
      }
      return { id }
    }),
  ItemObject,
])

const ItemArray = z.array(Item).min(1)

/**
 * Tolerant schema. Accepts the most common shapes GPT-5 mini emits and
 * normalizes to an array of `{ id, reasoning? }`.
 */
export const CandidatesSchema = z
  .union([
    z.object({ candidates: ItemArray }),
    z.object({ movies: ItemArray }),
    z.object({ results: ItemArray }),
    z.object({
      movie_ids: ItemArray,
      reasoning: z.string().optional(),
    }),
    ItemArray,
  ])
  .transform((data): ModelCandidate[] => {
    if (Array.isArray(data)) return filterValid(data)
    if ('candidates' in data) return filterValid(data.candidates)
    if ('movies' in data) return filterValid(data.movies)
    if ('results' in data) return filterValid(data.results)
    const topReasoning = (data as { reasoning?: string }).reasoning
    return filterValid(data.movie_ids).map((c) =>
      c.reasoning ? c : { ...c, reasoning: topReasoning },
    )
  })

function filterValid(items: ModelCandidate[]): ModelCandidate[] {
  const seen = new Set<number>()
  const out: ModelCandidate[] = []
  for (const item of items) {
    if (!Number.isFinite(item.id) || item.id <= 0) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}
