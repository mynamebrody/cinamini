import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all active games
    const { data: games, error: gamesError } = await supabase
      .from("cinamini_games")
      .select("*")
      .eq("is_active", true)
      .order("display_name")

    if (gamesError) {
      console.error("Error fetching games:", gamesError)
      return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
    }

    // Check if user has played each game today
    const today = new Date().toISOString().split('T')[0]
    const gamesWithStatus = await Promise.all(
      (games || []).map(async (game) => {
        // For now, only check retitled game
        if (game.game_id === 'retitled') {
          const { data: todaysPuzzle } = await supabase
            .from("retitled_puzzles")
            .select("id")
            .eq("puzzle_date", today)
            .single()

          if (todaysPuzzle) {
            const { data: hasPlayed } = await supabase
              .from("retitled_guesses")
              .select("id")
              .eq("user_id", user.id)
              .eq("puzzle_id", todaysPuzzle.id)
              .single()

            return {
              ...game,
              hasPlayedToday: !!hasPlayed
            }
          }
        }

        return {
          ...game,
          hasPlayedToday: false
        }
      })
    )

    return NextResponse.json({ 
      games: gamesWithStatus 
    })
  } catch (error) {
    console.error("Error in games API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}