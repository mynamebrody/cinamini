import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  generateShareText,
  calculateUserStats,
  type CastClimbResult
} from "@/lib/cast-climb"
import { sendGuessWebhook } from "@/lib/webhooks"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const isAnonymous = user.is_anonymous === true

    const body = await request.json()
    const { puzzleId, guessFilmId, guessFilmTitle, guessFilmYear, actorsRevealed, solveTimeMs, studioTimeMs } = body

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

    // Determine if this is a correct guess, skip, or give up
    const isCorrect = guessFilmId === puzzle.film_id
    const isSkip = guessFilmTitle === "_NEXT_HINT_SKIP_" || guessFilmTitle === "_GIVE_UP_"
    const attemptNumber = (existingGuesses?.length || 0) + 1

    // Don't allow more guesses if they've reached max attempts (4 actors) or already won
    const hasWon = existingGuesses?.some(g => g.is_correct) || false
    const maxAttempts = puzzle.total_actors || 4
    
    // Count ALL attempts (including skips) toward the max attempts limit
    const totalAttempts = existingGuesses?.length || 0

    // Prevent duplicate movie guesses within the same puzzle (only for non-skip attempts)
    if (!isSkip && existingGuesses?.some(g => 
      g.guess_film_id === guessFilmId && 
      g.guess_film_title !== "_NEXT_HINT_SKIP_" && 
      g.guess_film_title !== "_GIVE_UP_"
    )) {
      return NextResponse.json(
        { error: "You have already guessed that movie for this puzzle" },
        { status: 400 }
      )
    }

    if (hasWon) {
      return NextResponse.json(
        { error: "You have already completed this puzzle" },
        { status: 400 }
      )
    }
    
    // Prevent any additional attempts if they've already reached max attempts
    if (totalAttempts >= maxAttempts) {
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
        guess_film_year: guessFilmYear,
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

    // Check if game is completed (either correct guess or max total attempts reached)
    const isGameCompleted = isCorrect || allGuesses.length >= maxAttempts || guessFilmTitle === "_GIVE_UP_"
    
    // Calculate score for correct guesses (based on actors revealed - fewer actors = higher score)
    const calculateScoreForActorsRevealed = (actors: number): number => {
      // Score decreases as more actors are revealed
      // 1 actor = 1000 points, 2 actors = 750, 3 actors = 500, 4 actors = 250
      const maxScore = 1000
      const scoreDecrement = 250
      return Math.max(0, maxScore - ((actors - 1) * scoreDecrement))
    }
    
    const scoreForGuess = isCorrect ? calculateScoreForActorsRevealed(actorsRevealed) : 0
    
    // Fire webhook for authenticated guess (matching Poster Pixels format)
    const webhookPromise = sendGuessWebhook(request, {
      event: "guess",
      game: "cast-climb",
      user: { 
        isAuthenticated: !isAnonymous, 
        id: user.id, 
        email: isAnonymous ? null : (user.email ?? null) 
      },
      guess: {
        gameId: `${user.id}-${puzzle.puzzle_number}`, // Use puzzle number for consistency
        puzzleId: puzzle.puzzle_number,
        guessedMovieId: guessFilmId,
        guessedMovieTitle: guessFilmTitle,
        timeTakenMs: solveTimeMs || null, // Include time for all guesses, not just correct ones
        actorsRevealed,
        skipped: isSkip,
        score: scoreForGuess,
      },
      progress: {
        attemptNumber,
        maxAttempts,
        gameCompleted: isGameCompleted,
        isSkipped: isSkip,
        totalAttempts: attemptNumber,
      },
      correctAnswer: { 
        id: puzzle.film_id, 
        title: puzzle.film_title,
        isCorrect 
      },
    })

    // Fire webhook immediately (don't await - send in background)
    webhookPromise.catch(error => {
      console.error("🎬 CAST CLIMB: Webhook failed:", error)
    })
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
    const shareText = isGameCompleted ? generateShareText(puzzle.puzzle_number, allGuesses, isCorrect, isCorrect ? studioTimeMs : undefined) : ''
    
    // Prepare response
    const result: CastClimbResult = {
      correct: isCorrect,
      puzzle: {
        id: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        puzzleNumber: puzzle.puzzle_number,
        seedValue: '', // Don't expose seed
        filmId: puzzle.film_id,
        filmTitle: puzzle.film_title,
        filmPosterUrl: puzzle.film_poster_url,
        filmReleaseYear: puzzle.film_release_year,
        actors: puzzle.actors,
        totalActors: puzzle.total_actors,
        difficultyLevel: puzzle.difficulty_level,
        funFact: puzzle.fun_fact
      },
      user_guesses: allGuesses.map(guess => ({
        id: guess.id,
        userId: guess.user_id,
        puzzleId: guess.puzzle_id,
        guessFilmId: guess.guess_film_id,
        guessFilmTitle: guess.guess_film_title,
        guessFilmYear: guess.guess_film_year,
        isCorrect: guess.is_correct,
        actorsRevealed: guess.actors_revealed,
        solveTimeMs: guess.solve_time_ms,
        attemptNumber: guess.attempt_number,
        createdAt: guess.created_at
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
      game_completed: isGameCompleted,
      studio_time_ms: isGameCompleted ? studioTimeMs : undefined
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