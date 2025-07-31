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

    // Get current user stats
    const { data: currentStats } = await supabase
      .from("poster_pixels_user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    // Calculate new stats
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const isConsecutiveDay = currentStats?.last_played_date === yesterday
    const isSameDay = currentStats?.last_played_date === today

    // Don't update stats if playing the same puzzle multiple times in one day
    if (isSameDay) {
      return NextResponse.json({ success: true })
    }

    const newCurrentStreak = won 
      ? (isConsecutiveDay || !currentStats?.last_played_date ? (currentStats?.current_streak || 0) + 1 : 1)
      : 0

    const newStats = {
      user_id: user.id,
      games_played: (currentStats?.games_played || 0) + 1,
      games_won: (currentStats?.games_won || 0) + (won ? 1 : 0),
      current_streak: newCurrentStreak,
      longest_streak: Math.max(
        currentStats?.longest_streak || 0,
        newCurrentStreak
      ),
      average_time_ms: currentStats?.games_played 
        ? Math.round(((currentStats.average_time_ms || 0) * currentStats.games_played + total_time_ms) / (currentStats.games_played + 1))
        : total_time_ms,
      best_time_ms: won 
        ? Math.min(currentStats?.best_time_ms || total_time_ms, total_time_ms)
        : currentStats?.best_time_ms,
      last_played_date: today,
      updated_at: new Date().toISOString()
    }

    // Upsert user stats
    const { error: statsError } = await supabase
      .from("poster_pixels_user_stats")
      .upsert(newStats)

    if (statsError) {
      console.error("Error updating user stats:", statsError)
      // Don't fail the request if stats update fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error completing game:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}