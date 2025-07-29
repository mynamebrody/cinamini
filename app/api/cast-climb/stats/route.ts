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

    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .from("cast_climb_user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    // If no stats exist, return default values
    if (statsError || !stats) {
      const defaultStats = {
        games_played: 0,
        games_won: 0,
        current_streak: 0,
        longest_streak: 0,
        total_guesses: 0,
        perfect_games: 0,
        average_actors_revealed: 0,
        average_solve_time_ms: null,
        best_solve_time_ms: null,
        last_played_date: null,
        accuracy: 0,
        win_rate: 0
      }

      return NextResponse.json({ stats: defaultStats })
    }

    // Calculate derived stats
    const accuracy = stats.games_played > 0 
      ? Math.round((stats.games_won / stats.games_played) * 100) 
      : 0

    const winRate = accuracy // Same as accuracy for this game

    // Format response
    const response = {
      stats: {
        games_played: stats.games_played,
        games_won: stats.games_won,
        current_streak: stats.current_streak,
        longest_streak: stats.longest_streak,
        total_guesses: stats.total_guesses,
        perfect_games: stats.perfect_games,
        average_actors_revealed: stats.average_actors_revealed 
          ? parseFloat(stats.average_actors_revealed.toFixed(2))
          : 0,
        average_solve_time_ms: stats.average_solve_time_ms,
        best_solve_time_ms: stats.best_solve_time_ms,
        last_played_date: stats.last_played_date,
        accuracy,
        win_rate: winRate
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error in Cast Climb stats API:", error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}