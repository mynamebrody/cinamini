import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateSmartPuzzle, getRecentMovieIds, GenerationConfig } from '@/lib/openai-service'

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