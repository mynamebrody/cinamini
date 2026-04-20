/**
 * Writes one row per invocation into `puzzle_generation_logs`.
 *
 * Logging is best-effort: failures here are logged to the server console
 * but never thrown back to callers, so a transient DB error can't take down
 * the smart generator.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { GenerationMeta, PuzzleGameType } from './types'

export type LogOutcome =
  | 'success'
  | 'suggestions'
  | 'error'
  /**
   * Admin-pick mode: the strategy inspected every model candidate without
   * short-circuiting and emitted a `candidates-ready` terminal event. No
   * puzzle was built — the admin is expected to pick one and trigger a
   * second run with `forcedFilmId`.
   */
  | 'candidates_ready'

export interface LogEntry {
  adminUserId?: string
  gameType: PuzzleGameType
  targetDate: string
  modelId: string
  promptId: string | null
  promptVersion: number | null
  config: Record<string, unknown>
  excludedCount: number
  candidateIds: number[]
  finalFilmId: number | null
  outcome: LogOutcome
  durationMs: number
  tokensIn?: number
  tokensOut?: number
  error?: string
  rawResponse?: unknown
}

export async function logGeneration(
  supabase: SupabaseClient,
  entry: LogEntry,
): Promise<void> {
  try {
    const { error } = await supabase.from('puzzle_generation_logs').insert({
      admin_user_id: entry.adminUserId ?? null,
      game_type: entry.gameType,
      target_date: entry.targetDate,
      model: entry.modelId,
      prompt_id: entry.promptId,
      prompt_version: entry.promptVersion,
      config: entry.config,
      excluded_count: entry.excludedCount,
      candidate_ids: entry.candidateIds,
      final_film_id: entry.finalFilmId,
      outcome: entry.outcome,
      duration_ms: entry.durationMs,
      tokens_in: entry.tokensIn ?? null,
      tokens_out: entry.tokensOut ?? null,
      error: entry.error ?? null,
      raw_response: entry.rawResponse ?? null,
    })
    if (error) {
      console.warn(
        '[puzzle-generator] failed to write puzzle_generation_logs row:',
        error.message,
      )
    }
  } catch (err) {
    console.warn('[puzzle-generator] unexpected logger error:', err)
  }
}

/**
 * Convert a log entry to a compact `GenerationMeta` payload (used as the
 * `meta` field on every `GenerationResult`).
 */
export function entryToMeta(
  entry: Pick<
    LogEntry,
    | 'gameType'
    | 'targetDate'
    | 'modelId'
    | 'promptId'
    | 'promptVersion'
    | 'excludedCount'
    | 'candidateIds'
    | 'finalFilmId'
    | 'durationMs'
    | 'tokensIn'
    | 'tokensOut'
  >,
): GenerationMeta {
  return {
    gameType: entry.gameType,
    targetDate: entry.targetDate,
    modelId: entry.modelId,
    promptId: entry.promptId,
    promptVersion: entry.promptVersion,
    excludedCount: entry.excludedCount,
    candidateIds: entry.candidateIds,
    finalFilmId: entry.finalFilmId,
    durationMs: entry.durationMs,
    tokensIn: entry.tokensIn,
    tokensOut: entry.tokensOut,
  }
}
