import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateGameShare, ShareGenerationError } from "@/lib/sharing"
import type { GameShareData, ShareResult, GameType } from "@/lib/sharing"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-side share generation that fetches data from database
 */
async function generateServerSideShare(
  supabase: SupabaseClient,
  game: GameType,
  puzzleId: string,
  userId?: string
): Promise<ShareResult> {
  switch (game) {
    case 'retitled':
      return await generateRetitledServerShare(supabase, puzzleId, userId)
    
    case 'budget-bracket':
      return await generateBudgetBracketServerShare(supabase, puzzleId, userId)
    
    case 'cast-climb':
      return await generateCastClimbServerShare(supabase, puzzleId, userId)
    
    case 'poster-pixels':
      return await generatePosterPixelsServerShare(supabase, puzzleId, userId)
    
    default:
      throw new ShareGenerationError(`Unsupported game: ${game}`, game, puzzleId)
  }
}

// Game-specific server-side share generators

async function generateRetitledServerShare(
  supabase: SupabaseClient,
  puzzleId: string,
  userId?: string
): Promise<ShareResult> {
  // Fetch puzzle data
  const { data: puzzle } = await supabase
    .from('retitled_puzzles')
    .select('puzzle_number, country_code, localized_title')
    .eq('id', puzzleId)
    .single()
  
  if (!puzzle) {
    throw new ShareGenerationError('Puzzle not found', 'retitled', puzzleId)
  }

  // Fetch user guess if authenticated
  let isCorrect = false
  let solveTimeMs = 0
  
  if (userId) {
    const { data: guess } = await supabase
      .from('retitled_guesses')
      .select('is_correct, solve_time_ms')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzleId)
      .single()
    
    if (guess) {
      isCorrect = guess.is_correct
      solveTimeMs = guess.solve_time_ms || 0
    }
  }

  // Generate share data and use centralized generator
  const shareData: GameShareData = {
    game: 'retitled',
    puzzleId,
    gameData: {
      guess: { isCorrect, solveTimeMs },
      puzzle: {
        puzzleNumber: puzzle.puzzle_number,
        countryCode: puzzle.country_code,
        localizedTitle: puzzle.localized_title
      }
    },
    userId
  }

  return await generateGameShare(shareData)
}

async function generateBudgetBracketServerShare(
  supabase: SupabaseClient,
  puzzleId: string,
  userId?: string
): Promise<ShareResult> {
  // Fetch puzzle data
  const { data: puzzle } = await supabase
    .from('budget_bracket_puzzles')
    .select('puzzle_date, puzzle_number')
    .eq('id', puzzleId)
    .single()
  
  if (!puzzle) {
    throw new ShareGenerationError('Puzzle not found', 'budget-bracket', puzzleId)
  }

  // Use the puzzle_number field from the database
  const puzzleNumber = puzzle.puzzle_number

  // Fetch user game if authenticated  
  let gameData = {
    rounds: [],
    puzzle: { puzzleNumber },
    result: { isPerfectGame: false, totalDurationMs: 0, roundsCompleted: 0 }
  }
  
  if (userId) {
    const { data: game } = await supabase
      .from('budget_bracket_games')
      .select('choices, rounds_completed, is_perfect_game, total_duration_ms')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzleId)
      .single()
    
    if (game && game.choices) {
      gameData = {
        rounds: game.choices.map((choice: any) => ({
          round: choice.round,
          correct: choice.correct || false,
          timeMs: choice.time_taken_ms || 0
        })),
        puzzle: { puzzleNumber },
        result: {
          isPerfectGame: game.is_perfect_game,
          totalDurationMs: game.total_duration_ms || 0,
          roundsCompleted: game.rounds_completed
        }
      }
    }
  }

  const shareRequest: GameShareData = {
    game: 'budget-bracket',
    puzzleId,
    gameData,
    userId
  }

  return await generateGameShare(shareRequest)
}

async function generateCastClimbServerShare(
  supabase: SupabaseClient,
  puzzleId: string,
  userId?: string
): Promise<ShareResult> {
  // Fetch puzzle data
  const { data: puzzle } = await supabase
    .from('cast_climb_puzzles')
    .select('puzzle_number, total_actors')
    .eq('id', puzzleId)
    .single()
  
  if (!puzzle) {
    throw new ShareGenerationError('Puzzle not found', 'cast-climb', puzzleId)
  }

  // Fetch user guesses if authenticated
  let gameData: {
    guesses: Array<{ isCorrect: boolean; actorsRevealed: number; attemptNumber: number }>
    puzzle: { puzzleNumber: number }
    result: { isWin: boolean; totalGuesses: number }
  } = {
    guesses: [],
    puzzle: { puzzleNumber: puzzle.puzzle_number },
    result: { isWin: false, totalGuesses: 0 }
  }
  
  if (userId) {
    const { data: guesses } = await supabase
      .from('cast_climb_guesses')
      .select('is_correct, actors_revealed, attempt_number')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzleId)
      .order('attempt_number')
    
    if (guesses && guesses.length > 0) {
      const isWin = guesses.some(g => g.is_correct)
      gameData = {
        guesses: guesses.map(guess => ({
          isCorrect: guess.is_correct,
          actorsRevealed: guess.actors_revealed,
          attemptNumber: guess.attempt_number
        })),
        puzzle: { puzzleNumber: puzzle.puzzle_number },
        result: { isWin, totalGuesses: guesses.length }
      }
    }
  }

  const shareRequest: GameShareData = {
    game: 'cast-climb',
    puzzleId,
    gameData,
    userId
  }

  return await generateGameShare(shareRequest)
}

async function generatePosterPixelsServerShare(
  supabase: SupabaseClient,
  puzzleId: string,
  userId?: string
): Promise<ShareResult> {
  // Fetch puzzle data
  const { data: puzzle } = await supabase
    .from('poster_pixels_puzzles')
    .select('puzzle_number')
    .eq('id', puzzleId)
    .single()

  if (!puzzle) {
    throw new ShareGenerationError('Puzzle not found', 'poster-pixels', puzzleId)
  }

  let attempts: Array<{ isCorrect: boolean; clarityLevel: number; solveTimeMs: number; }> = []
  let isWin = false
  let finalScore = 0

  if (userId) {
    // Fetch guesses for this puzzle and user
    const { data: guesses } = await supabase
      .from('poster_pixels_guesses')
      .select('id, is_correct, clarity_level, guess_number')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzleId)
      .order('guess_number', { ascending: true })

    if (guesses && guesses.length > 0) {
      // Determine earliest correct guess if any
      const earliestCorrect = guesses.find(g => g.is_correct)
      const lastRelevant = earliestCorrect || guesses[guesses.length - 1]
      isWin = !!earliestCorrect

      // Build attempts up to that point
      const relevantGuesses = guesses.filter(g => g.guess_number <= lastRelevant.guess_number)

      attempts = relevantGuesses.map(g => ({
        isCorrect: g.is_correct,
        clarityLevel: typeof g.clarity_level === 'number' ? g.clarity_level : parseFloat(String(g.clarity_level || 0)),
        solveTimeMs: 0,
      }))

      // Score heuristic from clarity percent (or fractional) of the relevant guess
      const val = typeof lastRelevant.clarity_level === 'number' ? lastRelevant.clarity_level : parseFloat(String(lastRelevant.clarity_level || 0))
      const percent = val <= 1 ? Math.round(val * 100) : Math.round(val)
      if (percent <= 5) finalScore = 1000
      else if (percent <= 15) finalScore = 750
      else if (percent <= 35) finalScore = 500
      else if (percent <= 65) finalScore = 250
      else finalScore = 100
    }
  }

  const gameData = {
    attempts,
    puzzle: { puzzleNumber: puzzle.puzzle_number },
    result: { isWin, finalScore, timedOut: false },
  }

  const shareRequest: GameShareData = {
    game: 'poster-pixels',
    puzzleId,
    gameData,
    userId
  }

  return await generateGameShare(shareRequest)
}

/**
 * Unified Share API Endpoint
 * 
 * Handles share text generation for all games through a centralized endpoint.
 * New approach: Fetch game data from database instead of requiring client data.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Parse request body - now only requires game and puzzleId
    const body = await request.json()
    const { game, puzzleId } = body
    
    // Validate required fields
    if (!game || !puzzleId) {
      return NextResponse.json(
        { error: "Missing required fields: game, puzzleId" }, 
        { status: 400 }
      )
    }
    
    // Generate share text using server-side data fetching
    const shareResult = await generateServerSideShare(supabase, game, puzzleId, user?.id)
    
    return NextResponse.json({
      success: true,
      ...shareResult,
    })
    
  } catch (error) {
    console.error("Error in unified share API:", error)
    
    if (error instanceof ShareGenerationError) {
      return NextResponse.json(
        { 
          error: error.message,
          game: error.game,
          puzzleId: error.puzzleId,
        }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for basic game share URLs (fallback)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const game = searchParams.get('game')
  
  if (!game) {
    return NextResponse.json({ error: "Game parameter required" }, { status: 400 })
  }
  
  const gameUrls: Record<string, string> = {
    'retitled': 'https://cinamini.app/game/retitled',
    'budget-bracket': 'https://cinamini.app/game/budget-bracket', 
    'cast-climb': 'https://cinamini.app/game/cast-climb',
    'poster-pixels': 'https://cinamini.app/game/poster-pixels',
  }
  
  const shareUrl = gameUrls[game]
  if (!shareUrl) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 })
  }
  
  return NextResponse.json({
    shareUrl,
    game,
  })
}