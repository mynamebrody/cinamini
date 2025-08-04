import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()

    const { 
      game_id, 
      puzzle_id, 
      guessed_movie_id, 
      guessed_movie_title,
      time_taken_ms,
      clarity_level 
    } = await request.json()

    // Validate input
    if (!game_id || !puzzle_id || !guessed_movie_id || !guessed_movie_title || !time_taken_ms || clarity_level === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!user) {
      // For anonymous users, return a simple response
      // Note: This is a basic implementation - full anonymous support would require more work
      return NextResponse.json({
        isCorrect: false, // Would need to check against puzzle answer
        isGameCompleted: false,
        guessNumber: 1,
        anonymous: true,
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
    const isCorrect = guessed_movie_id === correctMovieId

    // Get current guess count
    const { count: guessCount } = await supabase
      .from("poster_pixels_guesses")
      .select("*", { count: "exact", head: true })
      .eq("game_id", game_id)

    const guessNumber = (guessCount || 0) + 1

    // Insert the guess
    const { data: newGuess, error: guessError } = await supabase
      .from("poster_pixels_guesses")
      .insert({
        user_id: user.id,
        puzzle_id,
        game_id,
        guess_number: guessNumber,
        guessed_movie_id,
        guessed_movie_title,
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
    if (isCorrect || guessNumber >= 6) {
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
      gameCompleted: updates.completed || false,
      won: updates.won || false,
    })
  } catch (error) {
    console.error("Error processing guess:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}