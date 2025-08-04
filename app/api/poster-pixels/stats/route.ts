import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // For anonymous users, return empty/default stats
      return NextResponse.json({
        stats: {
          games_played: 0,
          games_won: 0,
          current_streak: 0,
          longest_streak: 0,
          average_clarity_level: 0,
          best_time_ms: null,
          anonymous: true
        }
      })
    }

    // Get or create user stats
    const { data: stats, error: statsError } = await supabase
      .from("poster_pixels_user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error("Error fetching stats:", statsError)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    // If no stats exist, create them
    if (!stats) {
      const { data: newStats, error: createError } = await supabase
        .from("poster_pixels_user_stats")
        .insert({
          user_id: user.id,
          games_played: 0,
          games_won: 0,
          current_streak: 0,
          longest_streak: 0,
          average_time_ms: null,
          best_time_ms: null,
          last_played_date: null,
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating stats:", createError)
        return NextResponse.json({ error: "Failed to create stats" }, { status: 500 })
      }

      return NextResponse.json({ stats: newStats })
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error in stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}