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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateString = searchParams.get('date')
    
    if (!dateString) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user (optional - no longer required)
    const { data: { user } } = await supabase.auth.getUser()

    const puzzleDate = new Date(dateString + 'T00:00:00Z')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    
    // Check if date is valid
    if (isNaN(puzzleDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }
    
    // Check if date is in the future
    if (puzzleDate > today) {
      return NextResponse.json({ error: "Cannot access future puzzles" }, { status: 400 })
    }
    
    // Check if date is before game launch
    const launchDate = new Date('2024-01-01T00:00:00Z')
    if (puzzleDate < launchDate) {
      return NextResponse.json({ error: "No puzzle available for this date" }, { status: 404 })
    }
    
    // Create service role client for system operations (puzzle creation)
    const { createServiceClient } = await import('@/lib/supabase/server')
    const serviceSupabase = createServiceClient()
    
    // Try to get existing puzzle from database using service role for creation if needed
    const puzzle = await getOrCreatePuzzleForDate(serviceSupabase, puzzleDate)
    
    if (!puzzle) {
      console.error("Could not generate or retrieve puzzle for date:", dateString)
      return NextResponse.json({ error: "No puzzle available for this date" }, { status: 404 })
    }

    // Check if user has already played this puzzle (only if authenticated)
    let userGuess = null
    let hasPlayed = false
    let hasPlayedBefore = false
    
    if (user) {
      // First check if user has EVER played Retitled before (for how-to-play modal)
      const { data: anyPreviousGuesses } = await supabase
        .from("retitled_guesses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGuesses
      
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
        puzzleNumber: puzzle.puzzle_number,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Get existing puzzle or create a new one for the specified date
 */
async function getOrCreatePuzzleForDate(supabase: any, date: Date): Promise<any> {
  const dateString = date.toISOString().split('T')[0]
  
  try {
    // First, try to get existing puzzle
    const { data: existingPuzzle, error: fetchError } = await supabase
      .from("retitled_puzzles")
      .select("*, puzzle_number")
      .eq("puzzle_date", dateString)
      .single()

    if (existingPuzzle && !fetchError) {
      // Validate existing puzzle data
      if (validatePuzzleData(existingPuzzle)) {
        return existingPuzzle
      } else {
        console.warn("Existing puzzle has invalid data, regenerating...")
      }
    }

    // Generate new puzzle using the unified seeding system
    console.log(`Generating new Retitled puzzle for ${dateString}`)
    const generatedPuzzle = await generateDailyPuzzle(date)
    
    if (!generatedPuzzle) {
      console.error("Failed to generate puzzle")
      return null
    }

    // Insert new puzzle into database
    const { data: insertedPuzzle, error: insertError } = await supabase
      .from("retitled_puzzles")
      .insert({
        puzzle_date: generatedPuzzle.puzzle_date,
        film_id: generatedPuzzle.film_id,
        film_title: generatedPuzzle.film_title,
        localized_title: generatedPuzzle.localized_title,
        country_code: generatedPuzzle.country_code,
        country_name: generatedPuzzle.country_name,
        distractor_ids: generatedPuzzle.distractor_ids,
        difficulty_level: generatedPuzzle.difficulty_level,
        translation_note: generatedPuzzle.translation_note,
        seed_value: generatedPuzzle.seed_value,
        english_translation: generatedPuzzle.english_translation
      })
      .select("*, puzzle_number")
      .single()

    if (insertError) {
      // Check if it's a unique constraint violation (puzzle already exists)
      if (insertError.code === '23505') {
        console.log("Puzzle was created concurrently, fetching existing one")
        const { data: concurrentPuzzle } = await supabase
          .from("retitled_puzzles")
          .select("*, puzzle_number")
          .eq("puzzle_date", dateString)
          .single()
        return concurrentPuzzle
      } else {
        console.error("Error inserting puzzle:", insertError)
        return null
      }
    }

    console.log(`Successfully created Retitled puzzle for ${dateString}`)
    return insertedPuzzle
    
  } catch (error) {
    console.error("Error in getOrCreatePuzzleForDate:", error)
    return null
  }
}