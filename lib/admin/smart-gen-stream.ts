/**
 * Client-side helper for consuming `/api/admin/puzzles/generate` as NDJSON.
 *
 * Shared by:
 *   - `SmartGenerationDialog` (manual "Smart Generate" button)
 *   - The per-editor auto-run feature that fires when
 *     `/admin/puzzle-editor?movieId=<id>` deep-links in
 *
 * The helper is a thin `fetch` + line-splitter wrapper: it parses each
 * NDJSON line as a `GenerationEvent` and invokes `onEvent` for every one.
 * Callers own their own state (activity feed, success flash, suggestion
 * list, etc.) — the helper just handles the transport, line-buffering, and
 * abort/error plumbing.
 */

import type { GenerationEvent } from '@/lib/puzzle-generator/events'

export interface SmartGenStreamOptions {
  gameType: 'retitled' | 'cast-climb' | 'poster-pixels' | 'budget-bracket'
  targetDate: string
  /** Forces the generator to use this TMDB id (skips LLM candidate step). */
  forcedFilmId?: number
  /** Opt-in to OpenAI web_search. Off by default. */
  includeWebSearch?: boolean
  /**
   * How the generator picks the winning film.
   *
   *   - `'auto'` (default): generator inspects candidates in batches,
   *     short-circuits at the first eligible one, and returns a
   *     save-ready puzzle via a `success` event. Used by bulk callers
   *     and by the dialog's phase-2 build after the admin has picked.
   *
   *   - `'manual'`: generator inspects every candidate (no short-circuit)
   *     and emits a terminal `candidates-ready` event carrying the full
   *     attempt list. The admin dialog turns that into a progressive
   *     picker; clicking a card kicks off a second `streamSmartGeneration`
   *     call with `forcedFilmId` + `selectionMode: 'auto'`.
   *
   * Ignored when `forcedFilmId` is set (no candidate list to iterate).
   */
  selectionMode?: 'auto' | 'manual'
  /** Matches `LegacyClientConfig` in the route. Left partial on purpose. */
  config?: {
    minVoteCount?: number
    avoidRecentDays?: number
    avoidSameGameDays?: number
    budgetClosenessThreshold?: number
    retitledMaxBackTranslationSimilarity?: number
  }
  signal?: AbortSignal
  /** Fired for every event in the stream, in order. */
  onEvent: (event: GenerationEvent) => void
}

/**
 * Open a streaming POST to `/api/admin/puzzles/generate` and drive
 * `onEvent` with each parsed `GenerationEvent`. Resolves when the stream
 * completes (after a `done` event) or rejects on transport error. Abort
 * via `options.signal`; the caller is expected to swallow
 * `AbortError` via `isAbortError`.
 */
export async function streamSmartGeneration(
  options: SmartGenStreamOptions,
): Promise<void> {
  const body: Record<string, unknown> = {
    gameType: options.gameType,
    targetDate: options.targetDate,
    includeWebSearch: Boolean(options.includeWebSearch),
  }
  if (typeof options.forcedFilmId === 'number') {
    body.forcedFilmId = options.forcedFilmId
  }
  if (options.selectionMode === 'manual') {
    body.selectionMode = 'manual'
  }
  if (options.config) {
    body.config = options.config
  }

  const response = await fetch('/api/admin/puzzles/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    let message = `Smart generation request failed (${response.status})`
    try {
      const payload = await response.json()
      if (payload?.error) message = payload.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    try {
      const event = JSON.parse(trimmed) as GenerationEvent
      options.onEvent(event)
    } catch (err) {
      console.warn('[smart-gen-stream] bad NDJSON line:', trimmed, err)
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) consumeLine(line)
  }
  if (buf.trim()) consumeLine(buf)
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  return name === 'AbortError'
}
