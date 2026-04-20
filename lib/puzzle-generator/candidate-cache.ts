/**
 * Server-side cache for Smart Generate admin-pick (manual selectionMode)
 * runs. One row per game_type in `smart_gen_candidate_cache`; each row
 * holds the full `CandidateAttempt[]` the strategy produced in phase 1 so
 * the admin dialog can re-render the picker instantly on next open without
 * re-running the LLM.
 *
 * The cache is deliberately keyed by game_type ONLY (per the feature
 * design). `target_date` and `config_snapshot` are stored for UI badging
 * but do not participate in lookup. When phase 2 runs with a forced id,
 * the full eligibility check still happens in the strategy, so a stale
 * "accepted" card is safely re-rejected if exclusion windows have shifted.
 *
 * All failures are best-effort: the cache must never take down the
 * generator. Warn to the server console and move on.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateAttempt } from './events'
import type { PuzzleGameType } from './types'

const TABLE = 'smart_gen_candidate_cache'
const TTL_HOURS = 24

/** Shape returned by `readCandidateCache`. */
export interface CachedCandidateRow {
  gameType: PuzzleGameType
  attempts: CandidateAttempt[]
  targetDate: string | null
  configSnapshot: Record<string, unknown> | null
  createdAt: string
  expiresAt: string
}

/**
 * Overwrite the cached candidate list for `gameType`. Deletes any prior
 * rows for this game_type first so a read always returns exactly one
 * fresh entry.
 */
export async function writeCandidateCache(
  supabase: SupabaseClient,
  entry: {
    gameType: PuzzleGameType
    attempts: CandidateAttempt[]
    targetDate: string | null
    configSnapshot: Record<string, unknown> | null
  },
): Promise<void> {
  try {
    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .eq('game_type', entry.gameType)
    if (deleteError) {
      console.warn(
        '[puzzle-generator] writeCandidateCache: delete prior rows failed:',
        deleteError.message,
      )
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + TTL_HOURS)

    const { error: insertError } = await supabase.from(TABLE).insert({
      game_type: entry.gameType,
      attempts: entry.attempts,
      target_date: entry.targetDate,
      config_snapshot: entry.configSnapshot,
      expires_at: expiresAt.toISOString(),
    })
    if (insertError) {
      console.warn(
        '[puzzle-generator] writeCandidateCache: insert failed:',
        insertError.message,
      )
    }
  } catch (err) {
    console.warn('[puzzle-generator] writeCandidateCache threw:', err)
  }
}

/**
 * Return the latest non-expired row for `gameType`, or null on miss / error.
 */
export async function readCandidateCache(
  supabase: SupabaseClient,
  gameType: PuzzleGameType,
): Promise<CachedCandidateRow | null> {
  try {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'game_type, attempts, target_date, config_snapshot, created_at, expires_at',
      )
      .eq('game_type', gameType)
      .gte('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn(
        '[puzzle-generator] readCandidateCache: select failed:',
        error.message,
      )
      return null
    }
    if (!data) return null

    return {
      gameType: data.game_type as PuzzleGameType,
      attempts: (data.attempts ?? []) as CandidateAttempt[],
      targetDate: data.target_date ?? null,
      configSnapshot:
        (data.config_snapshot as Record<string, unknown> | null) ?? null,
      createdAt: data.created_at as string,
      expiresAt: data.expires_at as string,
    }
  } catch (err) {
    console.warn('[puzzle-generator] readCandidateCache threw:', err)
    return null
  }
}

/**
 * Remove any cached row for `gameType`. Best-effort: errors are logged but
 * never thrown. Used by the DELETE endpoint on the admin API.
 */
export async function clearCandidateCache(
  supabase: SupabaseClient,
  gameType: PuzzleGameType,
): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('game_type', gameType)
    if (error) {
      console.warn(
        '[puzzle-generator] clearCandidateCache: delete failed:',
        error.message,
      )
    }
  } catch (err) {
    console.warn('[puzzle-generator] clearCandidateCache threw:', err)
  }
}
