import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates the global user statistics when any game is played
 * This tracks overall platform engagement across all games
 */
export async function updateGlobalStats(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    // Get all play dates from all games
    const gameTables = [
      { table: 'retitled_guesses', dateColumn: 'created_at' },
      { table: 'cast_climb_guesses', dateColumn: 'created_at' },
      { table: 'budget_bracket_games', dateColumn: 'created_at' },
      { table: 'poster_pixels_games', dateColumn: 'created_at' }
    ]

    const playDates = new Set<string>()
    let totalGamesPlayed = 0

    for (const { table, dateColumn } of gameTables) {
      const { data, error } = await supabase
        .from(table)
        .select(dateColumn)
        .eq('user_id', userId)
        .order(dateColumn, { ascending: false })

      if (!error && data) {
        totalGamesPlayed += data.length
        data.forEach((row: any) => {
          const date = new Date(row[dateColumn]).toISOString().split('T')[0]
          playDates.add(date)
        })
      }
    }

    if (playDates.size === 0) {
      return
    }

    // Sort dates in descending order
    const sortedDates = Array.from(playDates).sort((a, b) => b.localeCompare(a))
    
    // Calculate consecutive days streak
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    let currentStreak = 0
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      // Start counting streak
      currentStreak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i])
        const prevDate = new Date(sortedDates[i - 1])
        const diffInDays = Math.round((prevDate.getTime() - currentDate.getTime()) / 86400000)
        
        if (diffInDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }

    // Calculate longest streak ever
    let longestStreak = currentStreak
    let tempStreak = 1
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      const prevDate = new Date(sortedDates[i - 1])
      const diffInDays = Math.round((prevDate.getTime() - currentDate.getTime()) / 86400000)
      
      if (diffInDays === 1) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }

    // Get current stats to check if we need to update longest_daily_streak
    const { data: existingStats } = await supabase
      .from('cinamini_user_stats')
      .select('longest_daily_streak')
      .eq('user_id', userId)
      .single()

    const finalLongestStreak = existingStats 
      ? Math.max(existingStats.longest_daily_streak || 0, longestStreak)
      : longestStreak

    // Upsert global stats
    await supabase
      .from('cinamini_user_stats')
      .upsert({
        user_id: userId,
        total_games_played: totalGamesPlayed,
        total_days_active: playDates.size,
        current_daily_streak: currentStreak,
        longest_daily_streak: finalLongestStreak,
        last_played_date: sortedDates[0],
        updated_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error updating global stats:', error)
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Gets the current global streak for a user
 * Returns 0 if no streak or error
 */
export async function getCurrentStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { data } = await supabase
      .from('cinamini_user_stats')
      .select('current_daily_streak')
      .eq('user_id', userId)
      .single()

    return data?.current_daily_streak || 0
  } catch {
    return 0
  }
}