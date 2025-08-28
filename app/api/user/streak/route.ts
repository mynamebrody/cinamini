import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ streak: 0 })
    }

    // First check if we have global stats
    const { data: globalStats } = await supabase
      .from('cinamini_user_stats')
      .select('current_daily_streak')
      .eq('user_id', user.id)
      .single()
    
    if (globalStats?.current_daily_streak) {
      return NextResponse.json({ streak: globalStats.current_daily_streak })
    }

    // If no global stats, calculate streak from all game play history
    // Get all game tables where user has played
    const gameTables = [
      { table: 'retitled_guesses', dateColumn: 'created_at' },
      { table: 'cast_climb_guesses', dateColumn: 'created_at' },
      { table: 'budget_bracket_games', dateColumn: 'created_at' },
      { table: 'poster_pixels_games', dateColumn: 'created_at' }
    ]

    // Collect all play dates
    const playDates = new Set<string>()

    for (const { table, dateColumn } of gameTables) {
      try {
        const { data } = await supabase
          .from(table)
          .select(dateColumn)
          .eq('user_id', user.id)
          .order(dateColumn, { ascending: false })

        if (data) {
          data.forEach((row: any) => {
            const date = new Date(row[dateColumn]).toISOString().split('T')[0]
            playDates.add(date)
          })
        }
      } catch (error) {
        // Table might not exist or user might not have played this game
        continue
      }
    }

    // Calculate consecutive days streak
    if (playDates.size === 0) {
      return NextResponse.json({ streak: 0 })
    }

    // Sort dates in descending order
    const sortedDates = Array.from(playDates).sort((a, b) => b.localeCompare(a))
    
    // Check if the most recent play was today or yesterday
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      // Streak is broken if last play wasn't today or yesterday
      return NextResponse.json({ streak: 0 })
    }

    // Count consecutive days
    let streak = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      const prevDate = new Date(sortedDates[i - 1])
      const diffInDays = Math.round((prevDate.getTime() - currentDate.getTime()) / 86400000)
      
      if (diffInDays === 1) {
        streak++
      } else {
        break
      }
    }

    // Update global stats for future use
    await supabase
      .from('cinamini_user_stats')
      .upsert({
        user_id: user.id,
        current_daily_streak: streak,
        last_played_date: sortedDates[0],
        total_days_active: playDates.size
      })

    return NextResponse.json({ streak })
  } catch (error) {
    console.error("Error fetching user streak:", error)
    return NextResponse.json({ streak: 0 })
  }
}