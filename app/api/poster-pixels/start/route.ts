import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { puzzle_id } = await request.json()

    if (!puzzle_id) {
      return NextResponse.json({ error: "Puzzle ID is required" }, { status: 400 })
    }

    // Check if user has already played this puzzle
    const { data: existingGame } = await supabase
      .from("poster_pixels_games")
      .select("id")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle_id)
      .single()

    if (existingGame) {
      return NextResponse.json({ error: "You have already played this puzzle" }, { status: 400 })
    }

    // Create new game
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

    return NextResponse.json({
      gameId: newGame.id,
      startTime: newGame.start_time,
    })
  } catch (error) {
    console.error("Error starting game:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}