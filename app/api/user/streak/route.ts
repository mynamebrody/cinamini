import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ streak: 0 })
    }

    // Query all game stat tables to find the highest current streak
    const gameStatTables = [
      'retitled_user_stats',
      'cast_climb_user_stats', 
      'budget_bracket_user_stats',
      'poster_pixels_user_stats'
    ]

    let maxStreak = 0

    for (const table of gameStatTables) {
      try {
        const { data } = await supabase
          .from(table)
          .select('current_streak')
          .eq('user_id', user.id)
          .single()

        if (data?.current_streak > maxStreak) {
          maxStreak = data.current_streak
        }
      } catch (error) {
        // Ignore errors for individual tables - user might not have stats yet
        continue
      }
    }

    return NextResponse.json({ streak: maxStreak })
  } catch (error) {
    console.error("Error fetching user streak:", error)
    return NextResponse.json({ streak: 0 })
  }
}