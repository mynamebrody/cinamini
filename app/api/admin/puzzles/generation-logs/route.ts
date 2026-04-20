/**
 * GET /api/admin/puzzles/generation-logs
 *
 * Admin read-only view of recent puzzle generation attempts. Supports simple
 * filters so the log page can slice by game / outcome / admin.
 *
 *   ?gameType=retitled|cast-climb|poster-pixels
 *   ?outcome=success|suggestions|error
 *   ?adminUserId=<uuid>
 *   ?since=<ISO timestamp>
 *   ?limit=<number, default 50, max 200>
 *   ?offset=<number, default 0>
 *
 * Response shape: { logs: Row[], total: number, limit, offset }.
 * Super-admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  SUPPORTED_GAME_TYPES,
  type PuzzleGameType,
} from '@/lib/puzzle-generator'

const VALID_OUTCOMES = new Set(['success', 'suggestions', 'error'])

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('cinamini_user_profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single()
  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const gameType = params.get('gameType')
  const outcome = params.get('outcome')
  const adminUserId = params.get('adminUserId')
  const since = params.get('since')
  const limit = clampInt(params.get('limit'), 50, 1, 200)
  const offset = clampInt(params.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER)

  if (gameType && !isSupportedGameType(gameType)) {
    return NextResponse.json(
      { error: `Invalid gameType: ${gameType}` },
      { status: 400 },
    )
  }
  if (outcome && !VALID_OUTCOMES.has(outcome)) {
    return NextResponse.json(
      { error: `Invalid outcome: ${outcome}` },
      { status: 400 },
    )
  }

  const service = createServiceClient()

  let query = service
    .from('puzzle_generation_logs')
    .select(
      'id, admin_user_id, game_type, target_date, model, prompt_id, prompt_version, config, excluded_count, candidate_ids, final_film_id, outcome, duration_ms, tokens_in, tokens_out, error, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (gameType) query = query.eq('game_type', gameType)
  if (outcome) query = query.eq('outcome', outcome)
  if (adminUserId) query = query.eq('admin_user_id', adminUserId)
  if (since) query = query.gte('created_at', since)

  const { data, error, count } = await query
  if (error) {
    console.error('[api/admin/puzzles/generation-logs] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: data ?? [],
    total: count ?? (data?.length ?? 0),
    limit,
    offset,
  })
}

function isSupportedGameType(value: string): value is PuzzleGameType {
  return (SUPPORTED_GAME_TYPES as readonly string[]).includes(value)
}

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}
