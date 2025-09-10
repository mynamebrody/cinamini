import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateSmartPuzzle, getRecentMovieIds, GenerationConfig } from '@/lib/openai-service'

function collectFilmIdsFromPuzzle(gameType: string, puzzle: any): number[] {
  if (!puzzle) return []
  if (gameType === 'budget-bracket') {
    const ids = new Set<number>()
    const pairs = Array.isArray(puzzle.pairs) ? puzzle.pairs : []
    for (const pair of pairs) {
      if (Array.isArray(pair)) {
        for (const m of pair) {
          if (typeof m?.id === 'number') ids.add(m.id)
        }
      }
    }
    return [...ids]
  }
  const id = typeof puzzle.film_id === 'number' ? puzzle.film_id : null
  return id ? [id] : []
}

function validateBudgetPairs(pairs: any[], threshold: number) {
  const violations: string[] = []
  let closeCount = 0
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    if (!Array.isArray(pair) || pair.length !== 2) {
      violations.push(`Round ${i + 1}: invalid pair shape`)
      continue
    }
    const [a, b] = pair
    const ab = Number(a?.budget || 0)
    const bb = Number(b?.budget || 0)
    if (!ab || !bb || ab <= 0 || bb <= 0) {
      violations.push(`Round ${i + 1}: budgets missing or non-positive`)
      continue
    }
    if (ab === bb) {
      violations.push(`Round ${i + 1}: identical budgets not allowed`)
      continue
    }
    const high = Math.max(ab, bb)
    const low = Math.min(ab, bb)
    const ratio = high / low
    if (ratio <= 1 + threshold) closeCount++
  }
  // "mostly close" = at least 4 of 5 pairs pass the threshold
  if (pairs.length >= 5 && closeCount < 4) {
    violations.push(`At least 4 of 5 pairs must be within ${(threshold * 100).toFixed(0)}%`) 
  }
  return violations
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    
    // Parse request body
    const body = await request.json()
    const { gameType, targetDate, config } = body
    
    // Validate inputs
    if (!gameType || !targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields: gameType and targetDate' },
        { status: 400 }
      )
    }
    
    const validGameTypes = ['retitled', 'budget-bracket', 'cast-climb', 'poster-pixels']
    if (!validGameTypes.includes(gameType)) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      )
    }
    
    // Get service client for database queries
    const serviceSupabase = await createServiceClient()
    
    // Get recent movie IDs to avoid duplicates
    const recentDays = config?.avoidRecentDays || 30
    const sameGameDays = config?.avoidSameGameDays || 365
    
    // Get all recent movies (last 30 days across all games)
    const allRecentMovieIds = await getRecentMovieIds(serviceSupabase, undefined, recentDays)
    
    // Get recent movies for same game type (last year)
    const sameGameRecentIds = await getRecentMovieIds(serviceSupabase, gameType, sameGameDays)
    
    // Combine both lists
    const avoidMovieIds = Array.from(new Set([...allRecentMovieIds, ...sameGameRecentIds]))
    
    // Generate smart puzzle using OpenAI
    const result = await generateSmartPuzzle(
      {
        gameType,
        targetDate,
        config: config as GenerationConfig
      },
      avoidMovieIds
    )
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          suggestions: result.suggestions 
        },
        { status: 400 }
      )
    }
    
    // Server-side eligibility checks (hard enforcement)
    const filmIds = collectFilmIdsFromPuzzle(gameType, result.puzzle)
    const disallowed = filmIds.filter(id => avoidMovieIds.includes(id))
    if (disallowed.length > 0) {
      return NextResponse.json(
        {
          error: 'Generated puzzle includes movies that violate recency rules (same-game 365d or any-game 30d).',
          conflicts: disallowed
        },
        { status: 409 }
      )
    }

    if (gameType === 'budget-bracket') {
      const pairs = Array.isArray(result.puzzle?.pairs) ? result.puzzle.pairs : []
      const threshold = Number(config?.budgetClosenessThreshold ?? 0.3)
      const violations = validateBudgetPairs(pairs, isFinite(threshold) ? threshold : 0.3)
      if (violations.length > 0) {
        return NextResponse.json(
          { error: 'Budget validation failed', violations },
          { status: 422 }
        )
      }
    }

    // Return the generated puzzle data
    return NextResponse.json({
      success: true,
      puzzle: result.puzzle,
      metadata: {
        gameType,
        targetDate,
        avoidedMovieIds: avoidMovieIds.length,
        config
      }
    })
    
  } catch (error) {
    console.error('Error generating smart puzzle:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get puzzle generation configuration
export async function GET() {
  try {
    // Check admin authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    
    // Return configuration options
    return NextResponse.json({
      defaultConfig: {
        obscurityThreshold: 5,
        budgetClosenessThreshold: 0.3,
        avoidRecentDays: 30,
        avoidSameGameDays: 365
      },
      thresholds: {
        obscurity: {
          min: 1,
          max: 10,
          description: '1 = mainstream blockbusters, 10 = very obscure films'
        },
        budgetCloseness: {
          min: 0.1,
          max: 0.5,
          description: 'Percentage difference allowed between movie budgets'
        },
        avoidRecent: {
          min: 7,
          max: 90,
          description: 'Days to look back for any game type'
        },
        avoidSameGame: {
          min: 30,
          max: 730,
          description: 'Days to look back for same game type'
        }
      }
    })
    
  } catch (error) {
    console.error('Error getting generation config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
