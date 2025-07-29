import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  generateShareText,
  calculateUserStats,
  type CastClimbResult
} from "@/lib/cast-climb"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { puzzleId, guessFilmId, guessFilmTitle, actorsRevealed, solveTimeMs } = body

    // Validate input
    if (!puzzleId || !guessFilmId || !guessFilmTitle || !actorsRevealed) {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400 }
      )
    }

    // Get puzzle details
    const { data: puzzle, error: puzzleError } = await supabase
      .from("cast_climb_puzzles")
      .select("*")
      .eq("id", puzzleId)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" }, 
        { status: 404 }
      )
    }

    // Check if user has already played this puzzle
    const { data: existingGuesses, error: existingError } = await supabase
      .from("cast_climb_guesses")
      .select("*")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .order("attempt_number", { ascending: true })

    if (existingError) {
      console.error('Error checking existing guesses:', existingError)
      return NextResponse.json(
        { error: "Failed to check existing guesses" },
        { status: 500 }
      )
    }

    // Determine if this is a correct guess
    const isCorrect = guessFilmId === puzzle.film_id
    const attemptNumber = (existingGuesses?.length || 0) + 1

    // Don't allow more guesses if they've reached max attempts (4 actors) or already won
    const hasWon = existingGuesses?.some(g => g.is_correct) || false
    const maxAttempts = puzzle.total_actors || 4

    if (hasWon) {
      return NextResponse.json(
        { error: "You have already completed this puzzle" },
        { status: 400 }
      )
    }

    if (existingGuesses && existingGuesses.length >= maxAttempts && !isCorrect) {
      return NextResponse.json(
        { error: "You have reached the maximum number of attempts" },
        { status: 400 }
      )
    }

    // Insert the guess
    const { data: newGuess, error: insertError } = await supabase
      .from("cast_climb_guesses")
      .insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        guess_film_id: guessFilmId,
        guess_film_title: guessFilmTitle,
        is_correct: isCorrect,
        actors_revealed: actorsRevealed,
        solve_time_ms: isCorrect ? solveTimeMs : null,
        attempt_number: attemptNumber
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting guess:', insertError)
      return NextResponse.json(
        { error: "Failed to save guess" },
        { status: 500 }
      )
    }

    // Get all user guesses for this puzzle (including the new one)
    const allGuesses = [...(existingGuesses || []), newGuess]

    // Check if game is completed (either correct guess or max attempts reached)
    const isGameCompleted = isCorrect || allGuesses.length >= maxAttempts
    let newStats = null

    if (isGameCompleted) {
      // Only update user stats when game is actually completed
      const { data: currentStats } = await supabase
        .from("cast_climb_user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single()

      const gameResult = {
        isWin: isCorrect,
        actorsRevealed: actorsRevealed,
        solveTimeMs: isCorrect ? solveTimeMs : undefined
      }

      newStats = calculateUserStats(currentStats, gameResult)
      newStats.last_played_date = new Date().toISOString().split('T')[0]
      newStats.updated_at = new Date().toISOString()

      // Upsert user stats
      const { error: statsError } = await supabase
        .from("cast_climb_user_stats")
        .upsert({
          user_id: user.id,
          ...newStats
        })

      if (statsError) {
        console.error('Error updating user stats:', statsError)
        // Don't fail the request if stats update fails
      }
    }

    // Generate share text (only if game is completed)
    const shareText = isGameCompleted ? generateShareText(puzzle.puzzle_number, allGuesses, isCorrect) : ''
    
    // Prepare response
    const result: CastClimbResult = {
      correct: isCorrect,
      puzzle: {
        id: puzzle.id,
        puzzle_date: puzzle.puzzle_date,
        puzzle_number: puzzle.puzzle_number,
        seed_value: '', // Don't expose seed
        film_id: puzzle.film_id,
        film_title: puzzle.film_title,
        film_poster_url: puzzle.film_poster_url,
        film_release_year: puzzle.film_release_year,
        actors: puzzle.actors,
        total_actors: puzzle.total_actors,
        difficulty_level: puzzle.difficulty_level,
        fun_fact: puzzle.fun_fact
      },
      user_guesses: allGuesses.map(guess => ({
        id: guess.id,
        user_id: guess.user_id,
        puzzle_id: guess.puzzle_id,
        guess_film_id: guess.guess_film_id,
        guess_film_title: guess.guess_film_title,
        is_correct: guess.is_correct,
        actors_revealed: guess.actors_revealed,
        solve_time_ms: guess.solve_time_ms,
        attempt_number: guess.attempt_number,
        created_at: guess.created_at
      })),
      stats: newStats ? {
        games_played: newStats.games_played,
        games_won: newStats.games_won,
        current_streak: newStats.current_streak,
        longest_streak: newStats.longest_streak,
        perfect_games: newStats.perfect_games,
        average_actors_revealed: newStats.average_actors_revealed || 0
      } : {
        games_played: 0,
        games_won: 0,
        current_streak: 0,
        longest_streak: 0,
        perfect_games: 0,
        average_actors_revealed: 0
      },
      share_text: shareText,
      game_completed: isGameCompleted
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error in Cast Climb guess API:", error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}