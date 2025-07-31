import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { 
  generateDailyPuzzle,
  validatePuzzleData,
  calculatePuzzleNumber
} from "@/lib/cast-climb"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    // Check if user has already played today
    let hasPlayed = false
    let userGuesses = []

    // Try to get existing puzzle from database
    const { data: existingPuzzle, error: puzzleError } = await supabase
      .from("cast_climb_puzzles")
      .select("*")
      .eq("puzzle_date", todayString)
      .single()

    let puzzle = existingPuzzle

    // If no puzzle exists, generate one
    if (!existingPuzzle || puzzleError) {
      try {
        console.log('Generating new Cast Climb puzzle for', todayString)
        const generatedPuzzle = await generateDailyPuzzle(today)
        
        if (!validatePuzzleData(generatedPuzzle)) {
          throw new Error('Invalid puzzle data generated')
        }

        // Create service role client for puzzle insertion (system operation)
        const serviceSupabase = createServiceClient()

        // Insert puzzle into database using service role client
        const { data: insertedPuzzle, error: insertError } = await serviceSupabase
          .from("cast_climb_puzzles")
          .insert({
            puzzle_date: generatedPuzzle.puzzle_date,
            puzzle_number: generatedPuzzle.puzzle_number,
            film_id: generatedPuzzle.film_id,
            film_title: generatedPuzzle.film_title,
            film_poster_url: generatedPuzzle.film_poster_url,
            film_release_year: generatedPuzzle.film_release_year,
            actors: generatedPuzzle.actors,
            total_actors: generatedPuzzle.total_actors,
            difficulty_level: generatedPuzzle.difficulty_level,
            fun_fact: generatedPuzzle.fun_fact
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting Cast Climb puzzle:', insertError)
          throw new Error('Failed to save puzzle')
        }

        puzzle = insertedPuzzle
      } catch (error) {
        console.error('Error generating Cast Climb puzzle:', error)
        return NextResponse.json(
          { error: "Failed to generate today's puzzle" }, 
          { status: 500 }
        )
      }
    }

    if (!puzzle) {
      return NextResponse.json(
        { error: "No puzzle available" }, 
        { status: 500 }
      )
    }

    // Check if user has played this puzzle
    const { data: existingGuesses, error: guessError } = await supabase
      .from("cast_climb_guesses")
      .select("*")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
      .order("created_at", { ascending: true })

    if (!guessError && existingGuesses && existingGuesses.length > 0) {
      // Check if game is completed: either correct guess or max attempts reached
      const hasCorrectGuess = existingGuesses.some(g => g.is_correct)
      const maxAttempts = puzzle.total_actors || 4
      const hasReachedMaxAttempts = existingGuesses.length >= maxAttempts
      hasPlayed = hasCorrectGuess || hasReachedMaxAttempts
      userGuesses = existingGuesses
    }

    // Prepare response
    const response = {
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
      userGuesses: hasPlayed ? userGuesses.map(guess => ({
        id: guess.id,
        guessFilmId: guess.guess_film_id,
        guessFilmTitle: guess.guess_film_title,
        guessFilmYear: guess.guess_film_year,
        isCorrect: guess.is_correct,
        actorsRevealed: guess.actors_revealed,
        solveTimeMs: guess.solve_time_ms,
        attemptNumber: guess.attempt_number,
        createdAt: guess.created_at
      })) : []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error in Cast Climb puzzle API:", error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}