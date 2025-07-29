import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (but don't require authentication)
    const { data: { user } } = await supabase.auth.getUser()

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

    // Check if user has played each game today (only if authenticated)
    let gamesWithStatus
    if (user) {
      const today = new Date().toISOString().split('T')[0]
      gamesWithStatus = await Promise.all(
        (games || []).map(async (game) => {
          let hasPlayedToday = false

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

                hasPlayedToday = !!hasPlayed
              }
            } else if (game.game_id === 'budget-bracket') {
              const { data: todaysPuzzle } = await supabase
                .from("budget_bracket_puzzles")
                .select("id")
                .eq("puzzle_date", today)
                .single()

              if (todaysPuzzle) {
                const { data: hasPlayed } = await supabase
                  .from("budget_bracket_games")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("puzzle_id", todaysPuzzle.id)
                  .single()

                hasPlayedToday = !!hasPlayed
              }
            } else if (game.game_id === 'poster-pixels') {
              const { data: todaysPuzzle } = await supabase
                .from("poster_pixels_puzzles")
                .select("id")
                .eq("puzzle_date", today)
                .single()

              if (todaysPuzzle) {
                const { data: hasPlayed } = await supabase
                  .from("poster_pixels_games")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("puzzle_id", todaysPuzzle.id)
                  .single()

                hasPlayedToday = !!hasPlayed
              }
            }
          } else if (game.game_id === 'cast-climb') {
            const { data: todaysPuzzle } = await supabase
              .from("cast_climb_puzzles")
              .select("id")
              .eq("puzzle_date", today)
              .single()

            if (todaysPuzzle) {
              const { data: hasPlayed } = await supabase
                .from("cast_climb_guesses")
                .select("id")
                .eq("user_id", user.id)
                .eq("puzzle_id", todaysPuzzle.id)
                .single()

              hasPlayedToday = !!hasPlayed
            }
          }
          return {
            ...game,
            hasPlayedToday
          }
        })
      )
    } else {
      // For unauthenticated users, just return games without play status
      gamesWithStatus = (games || []).map(game => ({
        ...game,
        hasPlayedToday: false
      }))
    }

    return NextResponse.json({ 
      games: gamesWithStatus 
    })
  } catch (error) {
    console.error("Error in games API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}