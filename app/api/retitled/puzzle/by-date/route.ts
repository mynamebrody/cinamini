import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMultipleMovies } from "@/lib/tmdb"
import { 
  generateDailyPuzzle,
  getCountryName,
  validatePuzzleData,
  SeededRandom
} from "@/lib/retitled"
import { getCountryFlag } from "@/lib/flag-emojis"
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
    
    // Get current user (optional - no longer required)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Create service role client for system operations (puzzle creation)
    const { createServiceClient } = await import('@/lib/supabase/server')
    const serviceSupabase = createServiceClient()
    
    // Configuration for Retitled puzzle generation
    const puzzleConfig: PuzzleConfig = {
      tableName: 'retitled_puzzles',
      generatePuzzle: generateRetitledPuzzle,
      insertPuzzleData: (puzzle) => ({
        puzzle_date: puzzle.puzzle_date,
        film_id: puzzle.film_id,
        film_title: puzzle.film_title,
        localized_title: puzzle.localized_title,
        country_code: puzzle.country_code,
        country_name: puzzle.country_name,
        distractor_ids: puzzle.distractor_ids,
        difficulty_level: puzzle.difficulty_level,
        translation_note: puzzle.translation_note,
        seed_value: puzzle.seed_value,
        english_translation: puzzle.english_translation
      })
    }
    
    // Get puzzle without allowing creation (by-date should not create puzzles)
    const puzzle = await getOrCreatePuzzleForDate(serviceSupabase, puzzleDate, puzzleConfig, false)
    
    if (!puzzle) {
      return createErrorResponse('No puzzle available for this date. Try today\'s puzzle instead.', 404)
    }
    

    // Check if user has already played this puzzle (only if authenticated)
    let userGuess = null
    let hasPlayed = false
    let hasPlayedBefore = false
    
    if (user) {
      // First check if user has EVER played Retitled before (for how-to-play modal)
      hasPlayedBefore = await checkUserPlayHistory(supabase, user.id, 'retitled_guesses')
      
      // Now check this specific puzzle
      const { data: userGuessData } = await supabase
        .from("retitled_guesses")
        .select("*")
        .eq("user_id", user.id)
        .eq("puzzle_id", puzzle.id)
        .single()
      
      userGuess = userGuessData
      hasPlayed = !!userGuessData
    }

    // Get all movie IDs for this puzzle
    const allMovieIds = [puzzle.film_id, ...puzzle.distractor_ids]
    
    // Fetch movie data from TMDB
    const movieData = await getMultipleMovies(allMovieIds)
    
    // Build the options array with actual movie data
    const options = movieData.map(movie => ({
      id: movie.id,
      title: movie.title
    }))

    // Shuffle options deterministically using the puzzle seed for consistency
    const rng = new SeededRandom(puzzle.seed_value + '_options')
    const shuffledOptions = rng.shuffle(options)

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        puzzleNumber: await calculatePuzzleNumberFromLaunch(serviceSupabase, 'retitled', new Date(puzzle.puzzle_date)),
        localizedTitle: puzzle.localized_title,
        englishTranslation: puzzle.english_translation || '',
        countryCode: puzzle.country_code,
        countryName: puzzle.country_name || getCountryName(puzzle.country_code),
        flagEmoji: getCountryFlag(puzzle.country_code),
        difficultyLevel: puzzle.difficulty_level,
        translationNote: puzzle.translation_note,
        seedValue: puzzle.seed_value,
        options: shuffledOptions
      },
      hasPlayed,
      hasPlayedBefore,
      userGuess: userGuess ? {
        guessFilmId: userGuess.guess_film_id,
        isCorrect: userGuess.is_correct,
        solveTimeMs: userGuess.solve_time_ms
      } : null
    })
  } catch (error) {
    console.error("Error in puzzle by date API:", error)
    
    // Return standardized error response
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500)
    }
    return createErrorResponse('Internal server error', 500)
  }
}

// Retitled specific puzzle generation
async function generateRetitledPuzzle(date: Date) {
  try {
    // Generate new puzzle using the unified seeding system
    const generatedPuzzle = await generateDailyPuzzle(date)
    
    if (!generatedPuzzle) {
      console.error("Failed to generate Retitled puzzle")
      return null
    }

    // Validate the generated puzzle
    if (!validatePuzzleData(generatedPuzzle)) {
      console.error("Generated puzzle has invalid data")
      return null
    }

    return generatedPuzzle
  } catch (error) {
    console.error("Error generating Retitled puzzle:", error)
    return null
  }
}