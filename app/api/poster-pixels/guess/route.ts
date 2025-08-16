import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendGuessWebhook } from "@/lib/webhooks"
import { POSTER_PIXELS_LEVELS, getScoreForClarityPercent } from "@/lib/poster-pixels-config"

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log("🚀 POSTER PIXELS GUESS API: Request received")
    }
    
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("🚀 POSTER PIXELS GUESS API: User authentication check", { 
        isAuthenticated: !!user, 
        userId: user?.id 
      })
    }

    const { 
      game_id, 
      puzzle_id, 
      guessed_movie_id, 
      guessed_movie_title,
      time_taken_ms,
      clarity_level,
      skipped = false,
      guess_number = 1, // Default to 1 if not provided
    } = await request.json()

    const maxAttempts = POSTER_PIXELS_LEVELS.length

    // Validate input (allow zero for time_taken_ms)
    if (!game_id || !puzzle_id || time_taken_ms === undefined || clarity_level === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If not skipped, require guess details
    if (!skipped && (!guessed_movie_id || !guessed_movie_title)) {
      return NextResponse.json({ error: "Missing guessed movie details" }, { status: 400 })
    }

    if (!user) {
      console.log("🚀 POSTER PIXELS GUESS API: Processing anonymous user")
      // For anonymous users, we need to get the puzzle to validate the guess properly
      
      // Get the puzzle to check correct answer (anonymous users need validation too)
      const { data: puzzle, error: puzzleError } = await supabase
        .from("poster_pixels_puzzles")
        .select("*")
        .eq("id", puzzle_id)
        .single()

      if (puzzleError || !puzzle) {
        return NextResponse.json({ error: "Puzzle not found" }, { status: 404 })
      }

      // Properly validate if guess is correct
      const correctMovieId = puzzle.film_id || puzzle.movie_data?.id
      const isCorrect = skipped ? false : guessed_movie_id === correctMovieId
      
      // Calculate game completion based on actual game state
      const gameCompleted = isCorrect || guess_number >= maxAttempts
      
      // Calculate score for correct guesses (same as authenticated users)
      const scoreForGuess = isCorrect ? getScoreForClarityPercent(clarity_level) : 0
      
      console.log("🚀 POSTER PIXELS GUESS API: Anonymous user validation", {
        correctMovieId,
        guessedMovieId: guessed_movie_id,
        isCorrect,
        gameCompleted,
        score: scoreForGuess
      })
      
      // Send webhook for every guess/skip
      await sendGuessWebhook(request, {
        event: "guess",
        game: "poster-pixels",
        user: { isAuthenticated: false },
        guess: {
          gameId: game_id,
          puzzleId: puzzle_id,
          guessedMovieId: skipped ? null : guessed_movie_id,
          guessedMovieTitle: skipped ? 'Skipped' : guessed_movie_title,
          timeTakenMs: time_taken_ms,
          clarityLevel: clarity_level,
          skipped,
          score: scoreForGuess, // Include score for anonymous users
        },
        progress: { 
          guessNumber: guess_number,
          clarityLevel: clarity_level,
          maxAttempts: maxAttempts,
          gameCompleted: gameCompleted,
          isSkipped: skipped,
        },
        correctAnswer: { 
          id: correctMovieId, 
          isCorrect,
          title: puzzle.film_title || puzzle.movie_data?.title,
        },
      })

      return NextResponse.json({
        isCorrect: isCorrect, // Return actual validation result
        isGameCompleted: gameCompleted,
        guessNumber: guess_number,
        anonymous: true,
        correctAnswer: gameCompleted ? {
          id: correctMovieId,
          title: puzzle.film_title || puzzle.movie_data?.title
        } : undefined,
        message: "Anonymous play - results not saved"
      })
    }

    // Get the game
    const { data: game, error: gameError } = await supabase
      .from("poster_pixels_games")
      .select("*, poster_pixels_puzzles(*)")
      .eq("id", game_id)
      .eq("user_id", user.id)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (game.completed) {
      return NextResponse.json({ error: "Game already completed" }, { status: 400 })
    }

    // Check if guess is correct
    const correctMovieId = game.poster_pixels_puzzles.film_id || game.poster_pixels_puzzles.movie_data?.id
    const isCorrect = skipped ? false : guessed_movie_id === correctMovieId

    // Get current guess count
    const { count: guessCount } = await supabase
      .from("poster_pixels_guesses")
      .select("*", { count: "exact", head: true })
      .eq("game_id", game_id)

    const guessNumber = (guessCount || 0) + 1

    // Prevent duplicate movie guesses within the same game
    if (!skipped && guessed_movie_id) {
      const { data: priorSameGuess } = await supabase
        .from("poster_pixels_guesses")
        .select("id")
        .eq("game_id", game_id)
        .eq("guessed_movie_id", guessed_movie_id)
        .limit(1)
        .maybeSingle()

      if (priorSameGuess) {
        return NextResponse.json({ error: "You have already guessed that movie" }, { status: 400 })
      }
    }

    // Calculate game completion status  
    const gameCompleted = isCorrect || guessNumber >= maxAttempts
    
    // Calculate score for this guess if it's correct
    const scoreForGuess = isCorrect ? getScoreForClarityPercent(clarity_level) : 0

    // Fire webhook for every guess/skip (BEFORE database operations to ensure it always sends)
    console.log("🚀 POSTER PIXELS GUESS API: About to send authenticated webhook", {
      gameId: game_id,
      webhookUrl: process.env.CINAMINI_GUESS_WEBHOOK_URL,
      hasWebhookUrl: !!process.env.CINAMINI_GUESS_WEBHOOK_URL,
      guessNumber,
      isCorrect,
      gameCompleted
    })

    const webhookPromise = sendGuessWebhook(request, {
      event: "guess",
      game: "poster-pixels",
      user: { isAuthenticated: true, id: user.id, email: user.email ?? null },
      guess: {
        gameId: game_id,
        puzzleId: puzzle_id,
        guessedMovieId: skipped ? null : guessed_movie_id,
        guessedMovieTitle: skipped ? 'Skipped' : guessed_movie_title,
        timeTakenMs: time_taken_ms,
        clarityLevel: clarity_level,
        skipped,
        score: scoreForGuess,
      },
      progress: { 
        guessNumber, 
        maxAttempts,
        gameCompleted,
        isSkipped: skipped,
      },
      correctAnswer: { 
        id: correctMovieId, 
        isCorrect,
        title: game.poster_pixels_puzzles.film_title || game.poster_pixels_puzzles.movie_data?.title,
      },
    })

    // Fire webhook immediately (don't await - send in background)
    webhookPromise.catch(error => {
      console.error("🚀 POSTER PIXELS: Webhook failed:", error)
    })

    // Insert the guess
    const { data: newGuess, error: guessError } = await supabase
      .from("poster_pixels_guesses")
      .insert({
        user_id: user.id,
        puzzle_id,
        game_id,
        guess_number: guessNumber,
        guessed_movie_id: skipped ? null : guessed_movie_id,
        guessed_movie_title: skipped ? 'Skipped' : guessed_movie_title,
        is_correct: isCorrect,
        time_taken_ms,
        clarity_level,
      })
      .select()
      .single()

    if (guessError) {
      console.error("Error saving guess:", guessError)
      throw guessError
    }

    // Update game stats
    const updates: any = {
      num_guesses: guessNumber,
    }

    // If correct or max guesses reached, complete the game
    if (gameCompleted) {
      updates.completed = true
      updates.won = isCorrect
      updates.end_time = new Date().toISOString()
      updates.total_time_ms = time_taken_ms
      updates.final_clarity_level = clarity_level
    }

    const { error: updateError } = await supabase
      .from("poster_pixels_games")
      .update(updates)
      .eq("id", game_id)

    if (updateError) {
      console.error("Error updating game:", updateError)
      throw updateError
    }

    return NextResponse.json({
      guess: newGuess,
      isCorrect,
      gameCompleted: gameCompleted,
      won: isCorrect,
    })
  } catch (error) {
    console.error("Error processing guess:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}