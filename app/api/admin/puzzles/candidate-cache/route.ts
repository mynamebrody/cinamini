/**
 * GET  /api/admin/puzzles/candidate-cache?gameType=<type>
 *   Return the latest non-expired cached CandidateAttempt[] for a game
 *   type, or `{ hit: false }` when nothing is cached.
 *
 * DELETE /api/admin/puzzles/candidate-cache?gameType=<type>
 *   Clear the cached row for a game type. Normally not needed — the
 *   generator overwrites the cache whenever the admin reruns Smart
 *   Generate in manual mode — but exposed for explicit "clear cache"
 *   affordances and admin debugging.
 *
 * Auth mirrors `/api/admin/puzzles/generate`: authenticated user must
 * have `cinamini_user_profiles.is_super_admin = true`.
 */

import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  readCandidateCache,
  clearCandidateCache,
} from '@/lib/puzzle-generator/candidate-cache'
import {
  SUPPORTED_GAME_TYPES,
  type PuzzleGameType,
} from '@/lib/puzzle-generator'

async function requireSuperAdmin(): Promise<NextResponse | null> {
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
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 },
    )
  }

  return null
}

function parseGameType(request: NextRequest): PuzzleGameType | NextResponse {
  const gameType = request.nextUrl.searchParams.get('gameType')
  if (!gameType) {
    return NextResponse.json(
      { error: 'Missing required query param: gameType' },
      { status: 400 },
    )
  }
  if (!SUPPORTED_GAME_TYPES.includes(gameType as PuzzleGameType)) {
    return NextResponse.json(
      { error: `Unsupported gameType: ${gameType}` },
      { status: 400 },
    )
  }
  return gameType as PuzzleGameType
}

export async function GET(request: NextRequest) {
  const authError = await requireSuperAdmin()
  if (authError) return authError

  const parsed = parseGameType(request)
  if (parsed instanceof NextResponse) return parsed

  // Service role bypasses RLS and matches how the orchestrator writes the
  // cache — keeps reader and writer consistent.
  const service = createServiceClient()
  const row = await readCandidateCache(service, parsed)

  if (!row) {
    return NextResponse.json({ hit: false })
  }

  return NextResponse.json({
    hit: true,
    gameType: row.gameType,
    attempts: row.attempts,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    targetDate: row.targetDate,
    configSnapshot: row.configSnapshot,
  })
}

export async function DELETE(request: NextRequest) {
  const authError = await requireSuperAdmin()
  if (authError) return authError

  const parsed = parseGameType(request)
  if (parsed instanceof NextResponse) return parsed

  const service = createServiceClient()
  await clearCandidateCache(service, parsed)

  return NextResponse.json({ success: true })
}
