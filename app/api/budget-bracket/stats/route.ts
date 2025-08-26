import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .from('budget_bracket_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching stats:', statsError)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // If no stats exist, return default values
    if (!stats) {
      const defaultStats = {
        user_id: user.id,
        games_played: 0,
        perfect_games: 0,
        current_streak: 0,
        best_streak: 0,
        total_rounds_won: 0,
        average_round_reached: 0,
        last_played_date: null
      }
      return NextResponse.json(defaultStats)
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Unexpected error in Budget Bracket stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}