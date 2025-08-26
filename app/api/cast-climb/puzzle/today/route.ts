import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { 
  generateDailyPuzzle,
  validatePuzzleData
} from "@/lib/cast-climb"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user (optional - no longer required)
    const { data: { user } } = await supabase.auth.getUser()

    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    // Check if user has already played today (only if authenticated)
    let hasPlayed = false
    let hasStarted = false
    let hasPlayedBefore = false // Has user ever played this game (for how-to-play modal)
    let userGuesses = []
    let lastActorsRevealed = 0

    // Try to get existing puzzle from database
    const { data: existingPuzzle, error: puzzleError } = await supabase
      .from("cast_climb_puzzles")
      .select("*")
      .eq("puzzle_date", todayString)
      .single()

    console.log('Existing puzzle query result:', { 
      hasData: !!existingPuzzle, 
      error: puzzleError?.message,
      errorCode: puzzleError?.code 
    })

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
            seed_value: generatedPuzzle.seed_value,
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
          // If it's a duplicate key error (race condition), try to get the existing puzzle
          if (insertError.code === '23505') {
            console.log('Puzzle already exists (race condition), fetching existing puzzle')
            // Use service client for consistency and add small delay for transaction completion
            await new Promise(resolve => setTimeout(resolve, 100))
            const serviceSupabase = createServiceClient()
            const { data: existingPuzzleRetry, error: retryError } = await serviceSupabase
              .from("cast_climb_puzzles")
              .select("*")
              .eq("puzzle_date", todayString)
              .single()
            
            if (!retryError && existingPuzzleRetry) {
              puzzle = existingPuzzleRetry
              console.log('Successfully fetched existing puzzle after race condition')
            } else {
              console.error('Error fetching existing puzzle after race condition:', retryError)
              // If we still can't find it, there might be a database issue
              // Let's try one more time with the original query method
              const { data: finalRetry, error: finalError } = await supabase
                .from("cast_climb_puzzles")
                .select("*")
                .eq("puzzle_date", todayString)
                .single()
              
              if (!finalError && finalRetry) {
                puzzle = finalRetry
                console.log('Successfully fetched existing puzzle on final retry')
              } else {
                console.error('Final retry also failed:', finalError)
                throw new Error('Failed to save puzzle')
              }
            }
          } else {
            console.error('Error inserting Cast Climb puzzle:', insertError)
            throw new Error('Failed to save puzzle')
          }
        } else {
          puzzle = insertedPuzzle
        }
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

    // Check if user has played this puzzle (only if authenticated)
    if (user) {
      // First check if user has EVER played Cast Climb before (for how-to-play modal)
      const { data: anyPreviousGuesses } = await supabase
        .from("cast_climb_guesses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGuesses
      
      // Now check today's puzzle specifically
      const { data: existingGuesses, error: guessError } = await supabase
        .from("cast_climb_guesses")
        .select("*")
        .eq("user_id", user.id)
        .eq("puzzle_id", puzzle.id)
        .order("created_at", { ascending: true })

      if (!guessError && existingGuesses && existingGuesses.length > 0) {
        // Game has been started if there are any guesses
        hasStarted = true
        userGuesses = existingGuesses
        
        // Check if game is completed: either correct guess or all actors revealed
        const hasCorrectGuess = existingGuesses.some(g => g.is_correct)
        const maxActors = puzzle.total_actors || 4
        
        // Check if game ended with give up or reached max actors revealed
        const hasGiveUp = existingGuesses.some(g => g.guess_film_title === "_GIVE_UP_")
        const maxActorsRevealed = Math.max(...existingGuesses.map(g => g.actors_revealed))
        const hasReachedMaxActors = maxActorsRevealed >= maxActors
        
        // Track the last actors revealed for resuming incomplete games
        lastActorsRevealed = maxActorsRevealed
        
        // Game is only "played" (complete) if it's finished
        hasPlayed = hasCorrectGuess || hasGiveUp || hasReachedMaxActors
        
        console.log('Cast Climb game state:', {
          hasStarted,
          hasPlayed,
          hasPlayedBefore,
          hasCorrectGuess,
          hasGiveUp,
          maxActorsRevealed,
          lastActorsRevealed,
          hasReachedMaxActors,
          guessCount: existingGuesses.length
        })
      }
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
      hasStarted,
      hasPlayedBefore,
      lastActorsRevealed,
      userGuesses: (hasPlayed || hasStarted) ? userGuesses.map(guess => ({
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