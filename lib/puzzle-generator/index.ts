/**
 * Public entry point for the smart puzzle generator.
 *
 *   generatePuzzleStream(req, { signal })
 *     Async generator that yields `GenerationEvent`s as the generator makes
 *     progress. The route layer forwards these as NDJSON lines so the admin
 *     dialog can display a live activity feed and cancel mid-run.
 *
 *   generatePuzzle(req, { signal })
 *     Drains the stream and returns the final `GenerationResult`. Kept for
 *     bulk / test callers that don't care about progress events.
 *
 * Both helpers guarantee exactly one row written to `puzzle_generation_logs`.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { getMovieById } from '@/lib/tmdb'
import { AIStructuredError, resolveModelId } from '@/lib/ai/openai-responses'
import { buildExclusionSet } from './eligibility'
import { resolvePrompt } from './prompts'
import { logGeneration, entryToMeta, type LogEntry } from './logger'
import { getStrategy } from './strategies/registry'
import {
  DEFAULT_GENERATION_CONFIG,
  StrategyNoneEligibleError,
  SUPPORTED_GAME_TYPES,
  type GenerationConfig,
  type GenerationRequest,
  type GenerationResult,
  type GenerationMeta,
} from './types'
import type {
  CandidateAttempt,
  GenerationEvent,
  RichSuggestion,
} from './events'
import type { TMDBMovie } from '@/lib/types/tmdb'

export * from './types'
export type { GenerationEvent, CandidateAttempt, RichSuggestion } from './events'
export { SUPPORTED_GAME_TYPES } from './types'

export interface GenerationRunOptions {
  /** Optional abort signal, forwarded to every OpenAI and TMDB fetch. */
  signal?: AbortSignal
}

/**
 * Streaming entry point. Yields:
 *   - lifecycle events (`status`, `model-text-delta`, `tool-call`, `candidates`,
 *     `candidate-scored`)
 *   - exactly one terminal event (`success`, `suggestions`, `error`, or
 *     `aborted`)
 *   - a final `done` event
 */
export async function* generatePuzzleStream(
  req: GenerationRequest,
  options: GenerationRunOptions = {},
): AsyncGenerator<GenerationEvent, void, unknown> {
  const startedAt = Date.now()
  const { signal } = options

  if (!SUPPORTED_GAME_TYPES.includes(req.gameType)) {
    yield {
      kind: 'error',
      error: `Unsupported game type: ${req.gameType}`,
    }
    yield { kind: 'done' }
    return
  }
  if (!isValidISODate(req.targetDate)) {
    yield {
      kind: 'error',
      error: `targetDate must be a YYYY-MM-DD string, got: ${req.targetDate}`,
    }
    yield { kind: 'done' }
    return
  }

  const config: Required<GenerationConfig> = mergeConfig(req.config)
  const supabase = createServiceClient()
  const modelId = resolveModelId(req.modelOverride)
  const strategy = getStrategy(req.gameType)
  const includeWebSearch = Boolean(req.includeWebSearch)

  yield {
    kind: 'status',
    label: 'Loading exclusions',
    detail: `Checking films used in any puzzle in the last ${Math.max(
      30,
      config.avoidRecentDays,
    )} days…`,
  }

  if (signal?.aborted) {
    yield { kind: 'aborted' }
    yield { kind: 'done' }
    return
  }

  let exclusion: Awaited<ReturnType<typeof buildExclusionSet>>
  try {
    exclusion = await buildExclusionSet(supabase, {
      gameType: req.gameType,
      avoidRecentDays: Math.max(30, config.avoidRecentDays),
      extraExclusions: req.extraExclusions,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load exclusions'
    const meta = emptyMeta(req.gameType, req.targetDate, modelId, startedAt)
    await writeLog(supabase, {
      adminUserId: req.adminUserId,
      gameType: req.gameType,
      targetDate: req.targetDate,
      modelId,
      promptId: null,
      promptVersion: null,
      config: config as unknown as Record<string, unknown>,
      excludedCount: 0,
      candidateIds: [],
      finalFilmId: null,
      outcome: 'error',
      durationMs: Date.now() - startedAt,
      error: message,
    })
    yield { kind: 'error', error: message, meta }
    yield { kind: 'done' }
    return
  }

  yield {
    kind: 'status',
    label: 'Resolving prompt',
    detail: `${exclusion.ids.size} film(s) excluded`,
  }

  const resolvedPrompt = await resolvePrompt(supabase, req.gameType, {
    target_date: req.targetDate,
    obscurity_threshold: config.obscurityThreshold,
    excluded_ids: formatExcludedIds(exclusion.ids),
  })

  if (signal?.aborted) {
    yield { kind: 'aborted' }
    yield { kind: 'done' }
    return
  }

  // Hardened prompt:
  //   * Strip any "Use web search to verify…" sentences when the caller has
  //     web_search disabled. Otherwise the model sees a tool-mandate it
  //     cannot satisfy and asks the admin "do you want me to proceed with
  //     web searches?" instead of returning JSON.
  //   * Always append an absolute output rule so the model never returns
  //     prose, never asks clarifying questions, and never requests tools.
  // This protects the generator from outdated DB-stored prompt rows AND
  // keeps the strategies framework-agnostic.
  const prompt = sanitizePrompt(resolvedPrompt, { includeWebSearch })

  const ctx = {
    gameType: req.gameType,
    targetDate: req.targetDate,
    config,
    excludedFilmIds: exclusion.ids,
    supabase,
    prompt,
    modelId,
    includeWebSearch,
  }

  yield {
    kind: 'status',
    label: 'Asking the model for candidates',
    detail: `${modelId}${includeWebSearch ? ' + web_search' : ''}`,
  }

  const strategyRun = strategy.generate(ctx, { signal })
  let candidateIdsFromStrategy: number[] = []

  try {
    while (true) {
      const next = await strategyRun.next()
      if (next.done) {
        const result = next.value
        candidateIdsFromStrategy = result.candidateIds
        const finalFilmId =
          (result.puzzle as { film_id?: number }).film_id ?? null
        const logBase: Omit<LogEntry, 'outcome'> = {
          adminUserId: req.adminUserId,
          gameType: req.gameType,
          targetDate: req.targetDate,
          modelId,
          promptId: prompt.id,
          promptVersion: prompt.version,
          config: config as unknown as Record<string, unknown>,
          excludedCount: exclusion.ids.size,
          candidateIds: result.candidateIds,
          finalFilmId,
          durationMs: Date.now() - startedAt,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        }
        await writeLog(supabase, { ...logBase, outcome: 'success' })
        yield {
          kind: 'success',
          puzzle: result.puzzle,
          meta: entryToMeta(logBase),
        }
        yield { kind: 'done' }
        return
      }
      const ev = next.value
      yield ev
      if (ev.kind === 'candidates') {
        candidateIdsFromStrategy = ev.ids
      }
    }
  } catch (err) {
    if (err instanceof StrategyNoneEligibleError) {
      const suggestions = await hydrateSuggestions(err)
      const logBase: Omit<LogEntry, 'outcome'> = {
        adminUserId: req.adminUserId,
        gameType: req.gameType,
        targetDate: req.targetDate,
        modelId,
        promptId: prompt.id,
        promptVersion: prompt.version,
        config: config as unknown as Record<string, unknown>,
        excludedCount: exclusion.ids.size,
        candidateIds: err.candidateIds,
        finalFilmId: null,
        durationMs: Date.now() - startedAt,
        tokensIn: err.tokensIn,
        tokensOut: err.tokensOut,
      }
      await writeLog(supabase, {
        ...logBase,
        outcome: 'suggestions',
        error: err.message,
      })
      yield {
        kind: 'suggestions',
        suggestions,
        error: err.message,
        meta: entryToMeta(logBase),
      }
      yield { kind: 'done' }
      return
    }

    if (isAbortError(err) || signal?.aborted) {
      const logBase: Omit<LogEntry, 'outcome'> = {
        adminUserId: req.adminUserId,
        gameType: req.gameType,
        targetDate: req.targetDate,
        modelId,
        promptId: prompt.id,
        promptVersion: prompt.version,
        config: config as unknown as Record<string, unknown>,
        excludedCount: exclusion.ids.size,
        candidateIds: candidateIdsFromStrategy,
        finalFilmId: null,
        durationMs: Date.now() - startedAt,
      }
      await writeLog(supabase, {
        ...logBase,
        outcome: 'error',
        error: 'aborted',
      })
      yield { kind: 'aborted' }
      yield { kind: 'done' }
      return
    }

    const message = err instanceof Error ? err.message : 'Unknown generation error'
    const detail =
      err instanceof AIStructuredError ? err.toDiagnostic() : undefined
    const logError =
      err instanceof AIStructuredError
        ? // Persist the compact diagnostic to puzzle_generation_logs so
          // admins can find it in the logs table even after the dialog is
          // closed.
          `${message}\n${err.toDiagnostic(400)}`
        : message
    console.error('[puzzle-generator] terminal error', {
      gameType: req.gameType,
      targetDate: req.targetDate,
      modelId,
      message,
      ...(err instanceof AIStructuredError
        ? {
            zodIssues: err.details.zodIssues,
            rawText: err.details.rawText,
          }
        : { error: err }),
    })
    const logBase: Omit<LogEntry, 'outcome'> = {
      adminUserId: req.adminUserId,
      gameType: req.gameType,
      targetDate: req.targetDate,
      modelId,
      promptId: prompt.id,
      promptVersion: prompt.version,
      config: config as unknown as Record<string, unknown>,
      excludedCount: exclusion.ids.size,
      candidateIds: candidateIdsFromStrategy,
      finalFilmId: null,
      durationMs: Date.now() - startedAt,
    }
    await writeLog(supabase, {
      ...logBase,
      outcome: 'error',
      error: logError,
    })
    yield { kind: 'error', error: message, detail, meta: entryToMeta(logBase) }
    yield { kind: 'done' }
  }
}

/**
 * Blocking entry point — drains `generatePuzzleStream` and returns the final
 * outcome. Kept mostly for bulk / test callers.
 */
export async function generatePuzzle(
  req: GenerationRequest,
  options: GenerationRunOptions = {},
): Promise<GenerationResult> {
  let result: GenerationResult | null = null
  for await (const ev of generatePuzzleStream(req, options)) {
    if (ev.kind === 'success') {
      result = { outcome: 'success', puzzle: ev.puzzle, meta: ev.meta }
    } else if (ev.kind === 'suggestions') {
      result = {
        outcome: 'suggestions',
        error: ev.error,
        suggestions: ev.suggestions,
        meta: ev.meta,
      }
    } else if (ev.kind === 'error') {
      result = {
        outcome: 'error',
        error: ev.error,
        detail: ev.detail,
        meta: ev.meta ?? emptyMeta(req.gameType, req.targetDate, resolveModelId(req.modelOverride), 0),
      }
    } else if (ev.kind === 'aborted') {
      result = {
        outcome: 'aborted',
        meta: emptyMeta(req.gameType, req.targetDate, resolveModelId(req.modelOverride), 0),
      }
    }
  }
  return (
    result ?? {
      outcome: 'error',
      error: 'Generator exited without a terminal event',
      meta: emptyMeta(req.gameType, req.targetDate, resolveModelId(req.modelOverride), 0),
    }
  )
}

function mergeConfig(override?: GenerationConfig): Required<GenerationConfig> {
  return {
    obscurityThreshold:
      clampThreshold(override?.obscurityThreshold) ??
      DEFAULT_GENERATION_CONFIG.obscurityThreshold,
    avoidRecentDays:
      override?.avoidRecentDays ?? DEFAULT_GENERATION_CONFIG.avoidRecentDays,
    retitledMaxBackTranslationSimilarity:
      override?.retitledMaxBackTranslationSimilarity ??
      DEFAULT_GENERATION_CONFIG.retitledMaxBackTranslationSimilarity,
  }
}

function clampThreshold(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.min(10, Math.max(1, value))
}

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function formatExcludedIds(ids: Set<number>): string {
  if (ids.size === 0) return 'none'
  return Array.from(ids).slice(0, 200).join(', ')
}

/**
 * Turn `StrategyNoneEligibleError.attempts` into `RichSuggestion[]`. Falls
 * back to a TMDB lookup if the strategy didn't populate `attempts` (so the
 * admin at least sees the movie posters).
 */
async function hydrateSuggestions(
  err: StrategyNoneEligibleError,
): Promise<RichSuggestion[]> {
  if (err.attempts.length > 0) {
    return err.attempts.slice(0, 8)
  }
  const ids = err.candidateIds.slice(0, 5)
  const out: RichSuggestion[] = []
  for (const id of ids) {
    const movie = await getMovieById(id).catch(() => null)
    if (!movie) continue
    out.push({
      movie: toMovieSummary(movie),
      verdict: 'rejected',
    })
  }
  return out
}

function toMovieSummary(movie: TMDBMovie): CandidateAttempt['movie'] {
  const releaseYear =
    typeof movie.release_date === 'string' && movie.release_date.length >= 4
      ? Number.parseInt(movie.release_date.slice(0, 4), 10)
      : null
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
    release_year: Number.isFinite(releaseYear) ? (releaseYear as number) : null,
  }
}

function emptyMeta(
  gameType: GenerationRequest['gameType'],
  targetDate: string,
  modelId: string,
  startedAt: number,
): GenerationMeta {
  return {
    gameType,
    targetDate,
    modelId,
    promptId: null,
    promptVersion: null,
    excludedCount: 0,
    candidateIds: [],
    finalFilmId: null,
    durationMs: startedAt === 0 ? 0 : Date.now() - startedAt,
  }
}

async function writeLog(
  supabase: Parameters<typeof logGeneration>[0],
  entry: LogEntry,
): Promise<void> {
  try {
    await logGeneration(supabase, entry)
  } catch (err) {
    console.warn('[puzzle-generator] logGeneration threw:', err)
  }
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  if (name === 'AbortError') return true
  const cause = (err as { cause?: unknown }).cause
  if (cause && typeof cause === 'object') {
    if ((cause as { name?: string }).name === 'AbortError') return true
  }
  return false
}

// Sentences in the DB-stored prompts that explicitly tell the model to use
// `web_search`. When the caller has the tool DISABLED the model otherwise
// sees a contradiction ("you must verify with web search" + no tool present)
// and replies with a clarifying question instead of JSON.
const WEB_SEARCH_SENTENCE_PATTERN =
  /\bUse web search[^.!?\n]*[.!?]\s*/gi

const JSON_ONLY_GUARDRAIL =
  'ABSOLUTE OUTPUT RULES (do not violate, even if other instructions conflict):\n' +
  '1. Respond with a single JSON object and nothing else. No prose, no markdown, no code fences.\n' +
  '2. Never ask the user clarifying questions. Never request permission. Never request tools.\n' +
  '3. Use only your training knowledge. Do not claim you need to look anything up.\n' +
  '4. If you are uncertain, still produce your best JSON answer — do not refuse.\n'

const WEB_SEARCH_AVAILABLE_NOTE =
  'You have access to the `web_search` tool. Use it silently when needed; ' +
  'do not mention it to the user. Always finish by emitting the JSON object.'

const WEB_SEARCH_DISABLED_NOTE =
  'You do NOT have access to any tools (no web_search, no browser). Rely entirely ' +
  'on your training knowledge of films and TMDB. Do not request tools.'

interface SanitizedPrompt {
  id: string | null
  version: number | null
  system: string
  user: string
}

function sanitizePrompt(
  prompt: { id: string | null; version: number | null; system: string; user: string },
  options: { includeWebSearch: boolean },
): SanitizedPrompt {
  let system = prompt.system ?? ''
  if (!options.includeWebSearch) {
    system = system.replace(WEB_SEARCH_SENTENCE_PATTERN, '').trim()
  }
  const toolNote = options.includeWebSearch
    ? WEB_SEARCH_AVAILABLE_NOTE
    : WEB_SEARCH_DISABLED_NOTE
  const decoratedSystem = [JSON_ONLY_GUARDRAIL, system, toolNote]
    .filter((s) => s && s.trim().length > 0)
    .join('\n\n')
  return {
    id: prompt.id,
    version: prompt.version,
    system: decoratedSystem,
    user: prompt.user,
  }
}
