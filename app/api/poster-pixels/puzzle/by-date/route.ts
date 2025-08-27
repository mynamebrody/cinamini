import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generatePosterPixelsPuzzle } from "@/lib/poster-pixels"
import {
  validatePuzzleDate,
  getOrCreatePuzzleForDate,
  createErrorResponse,
  checkUserPlayHistory,
  type PuzzleConfig
} from '@/lib/api/puzzle-by-date'
import { calculatePuzzleNumberFromLaunch } from '@/lib/puzzle-numbering'

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
    
    // Configuration for Poster Pixels puzzle generation
    const puzzleConfig: PuzzleConfig = {
      tableName: 'poster_pixels_puzzles',
      generatePuzzle: generatePosterPixelsPuzzle,
      insertPuzzleData: (puzzle) => ({
        puzzle_date: puzzle.puzzle_date,
        film_id: puzzle.film_id,
        film_title: puzzle.film_title,
        film_poster_url: puzzle.film_poster_url,
        film_release_year: puzzle.film_release_year,
        clarity_levels: puzzle.clarity_levels,
        difficulty_level: puzzle.difficulty_level,
        seed_value: puzzle.seed_value,
        is_published: true,
        movie_data: puzzle.movie_data
      })
    }
    
    // Get puzzle without allowing creation (by-date should not create puzzles)
    const puzzle = await getOrCreatePuzzleForDate(serviceSupabase, puzzleDate, puzzleConfig, false)
    
    if (!puzzle) {
      return createErrorResponse('No puzzle available for this date. Try today\'s puzzle instead.', 404)
    }

    // Check if user has already played this puzzle
    let hasPlayed = false
    let hasPlayedBefore = false
    let userGame = null
    let userGuesses: any[] = []
    
    if (user) {
      // Check if user has EVER played Poster Pixels before
      hasPlayedBefore = await checkUserPlayHistory(supabase, user.id, 'poster_pixels_games')
      
      // Get user's game for this puzzle
      const { data: gameData } = await supabase
        .from('poster_pixels_games')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .single()
      
      if (gameData) {
        hasPlayed = true
        userGame = gameData
        
        // Get all guesses for this game
        const { data: guessesData } = await supabase
          .from('poster_pixels_guesses')
          .select('*')
          .eq('user_id', user.id)
          .eq('puzzle_id', puzzle.id)
          .order('created_at', { ascending: true })
        
        if (guessesData) {
          userGuesses = guessesData.map(guess => ({
            id: guess.id,
            guessedMovieId: guess.guessed_movie_id,
            guessedMovieTitle: guess.guessed_movie_title,
            isCorrect: guess.is_correct,
            clarityLevel: guess.clarity_level,
            guessTimeMs: guess.guess_time_ms,
            createdAt: guess.created_at
          }))
        }
      }
    }

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzle_date: puzzle.puzzle_date,
        puzzle_number: await calculatePuzzleNumberFromLaunch(supabase, 'poster-pixels', new Date(puzzle.puzzle_date)),
        // New admin structure fields
        film_id: puzzle.film_id,
        film_title: puzzle.film_title,
        film_poster_url: puzzle.film_poster_url,
        film_release_year: puzzle.film_release_year,
        clarity_levels: puzzle.clarity_levels,
        // Legacy movie_data for backward compatibility
        movie_data: puzzle.movie_data || {
          id: puzzle.film_id,
          title: puzzle.film_title,
          poster_path: puzzle.film_poster_url,
          release_date: puzzle.film_release_year ? `${puzzle.film_release_year}-01-01` : null,
        },
      },
      hasPlayedToday: hasPlayed,
      hasPlayedBefore,
      previousGame: userGame ? {
        id: userGame.id,
        won: userGame.won,
        totalTimeMs: userGame.total_time_ms,
        total_time_ms: userGame.total_time_ms,
        final_clarity_level: userGame.final_clarity_level,
        finalClarityLevel: userGame.final_clarity_level,
        finalScore: userGame.final_score,
        completed: userGame.completed,
        numGuesses: userGame.num_guesses,
        guesses: userGuesses.map(guess => ({
          movieId: guess.guessedMovieId,
          movieTitle: guess.guessedMovieTitle,
          isCorrect: guess.isCorrect,
          clarityLevel: guess.clarityLevel,
        }))
      } : null
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

// Note: Poster Pixels uses the generateDailyPuzzle function directly from lib/poster-pixels
// which already handles all the puzzle generation logic