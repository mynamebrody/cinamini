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

    const { game_id, won, total_time_ms, final_clarity_level } = await request.json()

    if (!game_id || won === undefined || !total_time_ms || final_clarity_level === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update the game
    const { error: updateError } = await supabase
      .from("poster_pixels_games")
      .update({
        completed: true,
        won,
        end_time: new Date().toISOString(),
        total_time_ms,
        final_clarity_level,
      })
      .eq("id", game_id)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("Error completing game:", updateError)
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error completing game:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}