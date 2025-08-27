import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()

    const { puzzle_id } = await request.json()

    if (!puzzle_id) {
      return NextResponse.json({ error: "Puzzle ID is required" }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🚀 POSTER PIXELS START API: User check", {
      userId: user.id,
      isAnonymous: user.is_anonymous === true,
      puzzleId: puzzle_id
    })

    // Check if user has already played this puzzle (works for both anonymous and authenticated)
    const { data: existingGame } = await supabase
      .from("poster_pixels_games")
      .select("*")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle_id)
      .single()

    if (existingGame) {
      console.log("🚀 POSTER PIXELS START API: Existing game found", {
        gameId: existingGame.id,
        userId: existingGame.user_id
      })
      return NextResponse.json({ 
        gameId: existingGame.id,
        startTime: existingGame.start_time,
        alreadyExists: true
      })
    }

    // Create new game (works for both anonymous and authenticated users)
    const { data: newGame, error: gameError } = await supabase
      .from("poster_pixels_games")
      .insert({
        user_id: user.id,
        puzzle_id,
        start_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (gameError) {
      console.error("Error creating game:", gameError)
      throw gameError
    }

    console.log("🚀 POSTER PIXELS START API: Game created", {
      gameId: newGame.id,
      userId: user.id,
      isAnonymous: user.is_anonymous === true,
      startTime: newGame.start_time
    })

    return NextResponse.json({
      gameId: newGame.id,
      startTime: newGame.start_time,
    })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}