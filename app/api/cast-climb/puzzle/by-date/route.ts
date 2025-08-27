import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateDailyPuzzle } from "@/lib/cast-climb"
import {
  validatePuzzleDate,
  getOrCreatePuzzleForDate,
  createErrorResponse,
  checkUserPlayHistory,
  type PuzzleConfig
} from '@/lib/api/puzzle-by-date'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateString = searchParams.get('date')
    
    // Validate date using shared utility
    const validation = validatePuzzleDate(dateString)
    if (!validation.isValid) {
      return createErrorResponse(validation.error!.message, validation.error!.status)
    }
    
    const puzzleDate = validation.puzzleDate!
    const supabase = await createClient()
    
    // Get current user for checking play status
    const { data: { user } } = await supabase.auth.getUser()

    // Service role client for creating puzzles if needed
    const { createServiceClient } = await import('@/lib/supabase/server')
    const serviceSupabase = createServiceClient()
    
    // Configuration for Cast Climb puzzle generation
    const puzzleConfig: PuzzleConfig = {
      tableName: 'cast_climb_puzzles',
      generatePuzzle: generateDailyPuzzle,
      insertPuzzleData: (puzzle) => ({
        puzzle_date: puzzle.puzzle_date,
        puzzle_number: puzzle.puzzle_number,
        film_id: puzzle.film_id,
        film_title: puzzle.film_title,
        film_poster_url: puzzle.film_poster_url,
        film_release_year: puzzle.film_release_year,
        actors: puzzle.actors,
        total_actors: puzzle.total_actors,
        difficulty_level: puzzle.difficulty_level,
        fun_fact: puzzle.fun_fact
      })
    }
    
    // Get or create puzzle using shared utility
    const puzzle = await getOrCreatePuzzleForDate(serviceSupabase, puzzleDate, puzzleConfig)
    
    if (!puzzle) {
      return createErrorResponse('No puzzle available for this date', 404)
    }

    // Check if user has already played this puzzle
    let hasPlayed = false
    let hasPlayedBefore = false
    let userGuesses: any[] = []
    
    if (user) {
      // Check if user has EVER played Cast Climb before
      hasPlayedBefore = await checkUserPlayHistory(supabase, user.id, 'cast_climb_guesses')
      
      // Get all guesses for this puzzle
      const { data: guessesData } = await supabase
        .from('cast_climb_guesses')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .order('attempt_number', { ascending: true })
      
      if (guessesData && guessesData.length > 0) {
        hasPlayed = true
        userGuesses = guessesData.map(guess => ({
          id: guess.id,
          guessFilmId: guess.guess_film_id,
          guessFilmTitle: guess.guess_film_title,
          isCorrect: guess.is_correct,
          actorsRevealed: guess.actors_revealed,
          solveTimeMs: guess.solve_time_ms,
          attemptNumber: guess.attempt_number,
          createdAt: guess.created_at
        }))
      }
    }

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        puzzleNumber: puzzle.puzzle_number,
        filmId: puzzle.film_id,
        filmTitle: puzzle.film_title,
        filmPosterUrl: puzzle.film_poster_url,
        filmReleaseYear: puzzle.film_release_year,
        actors: puzzle.actors,
        totalActors: puzzle.total_actors,
        difficultyLevel: puzzle.difficulty_level,
        funFact: puzzle.fun_fact
      },
      hasPlayed,
      hasPlayedBefore,
      userGuesses,
      gameCompleted: hasPlayed && (
        userGuesses.some(g => g.isCorrect) || 
        userGuesses.length >= 4
      )
    })
  } catch (error) {
    console.error('Error fetching puzzle by date:', error)
    
    // Return standardized error response
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500)
    }
    return createErrorResponse('Internal server error', 500)
  }
}

// Note: Cast Climb uses the generateDailyPuzzle function directly from lib/cast-climb
// which already handles all the puzzle generation logic