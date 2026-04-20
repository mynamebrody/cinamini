/**
 * GET /api/admin/puzzles/next-available-date?gameType=retitled
 *
 * Returns the first date from today (UTC) that does not yet have a scheduled
 * puzzle for the given game type. Used by the admin Smart Generation dialog to
 * auto-pick a puzzle date when the editor doesn't have one set.
 *
 * Request:
 *   - gameType: one of "retitled", "cast-climb", "poster-pixels", "budget-bracket"
 *
 * Response:
 *   200 { gameType, date: "YYYY-MM-DD" }
 *   400 { error } — invalid / missing gameType
 *   401/403 { error } — not authenticated / not super-admin
 *   500 { error } — DB failure
 */

import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

const GAME_TYPE_TO_TABLE: Record<string, string> = {
  retitled: 'retitled_puzzles',
  'cast-climb': 'cast_climb_puzzles',
  'poster-pixels': 'poster_pixels_puzzles',
  'budget-bracket': 'budget_bracket_puzzles',
}

const LOOKAHEAD_DAYS = 365

function todayUtcIso(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysUtc(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const ny = dt.getUTCFullYear()
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(dt.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType') ?? ''

    const table = GAME_TYPE_TO_TABLE[gameType]
    if (!table) {
      return NextResponse.json(
        {
          error: `Invalid gameType. Expected one of: ${Object.keys(
            GAME_TYPE_TO_TABLE,
          ).join(', ')}`,
        },
        { status: 400 },
      )
    }

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

    const serviceSupabase = createServiceClient()

    const today = todayUtcIso()
    const horizon = addDaysUtc(today, LOOKAHEAD_DAYS)

    const { data: rows, error } = await serviceSupabase
      .from(table)
      .select('puzzle_date')
      .gte('puzzle_date', today)
      .lte('puzzle_date', horizon)
      .order('puzzle_date', { ascending: true })

    if (error) {
      console.error(
        '[next-available-date] supabase error',
        gameType,
        error,
      )
      return NextResponse.json(
        { error: 'Failed to query puzzle schedule' },
        { status: 500 },
      )
    }

    const taken = new Set<string>(
      (rows ?? [])
        .map((r: { puzzle_date: string | null }) => r.puzzle_date)
        .filter((d): d is string => !!d),
    )

    let candidate = today
    for (let i = 0; i <= LOOKAHEAD_DAYS; i++) {
      if (!taken.has(candidate)) {
        return NextResponse.json({ gameType, date: candidate })
      }
      candidate = addDaysUtc(candidate, 1)
    }

    return NextResponse.json(
      {
        error: `No open puzzle date found within ${LOOKAHEAD_DAYS} days`,
      },
      { status: 409 },
    )
  } catch (err) {
    console.error('[next-available-date] unexpected error', err)
    return NextResponse.json(
      { error: 'Unexpected error computing next available date' },
      { status: 500 },
    )
  }
}
