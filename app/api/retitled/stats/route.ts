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
      .from("retitled_user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error fetching stats:", statsError)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    // Get the last guess to show the title
    const { data: lastGuess } = await supabase
      .from("retitled_guesses")
      .select(`
        created_at,
        puzzle_id,
        retitled_puzzles (
          localized_title,
          country_code,
          flag_emoji
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Return default stats if user hasn't played yet
    if (!stats) {
      return NextResponse.json({
        stats: {
          gamesPlayed: 0,
          gamesCorrect: 0,
          accuracy: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageSolveTime: "0s",
          countriesGuessed: [],
          lastPlayed: null,
          lastGuessedTitle: null
        }
      })
    }

    // Format average solve time
    const avgTimeSeconds = Math.round(stats.average_solve_time_ms / 1000)
    const averageSolveTime = avgTimeSeconds < 60 
      ? `${avgTimeSeconds}s`
      : `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s`

    return NextResponse.json({
      stats: {
        gamesPlayed: stats.games_played,
        gamesCorrect: stats.games_correct,
        accuracy: stats.games_played > 0 
          ? Math.round((stats.games_correct / stats.games_played) * 100 * 10) / 10
          : 0,
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        averageSolveTime,
        countriesGuessed: stats.countries_guessed || [],
        lastPlayed: stats.last_played_date,
        lastGuessedTitle: lastGuess?.retitled_puzzles ? {
          localizedTitle: lastGuess.retitled_puzzles.localized_title,
          countryCode: lastGuess.retitled_puzzles.country_code,
          flagEmoji: lastGuess.retitled_puzzles.flag_emoji
        } : null
      }
    })
  } catch (error) {
    console.error("Error in stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}