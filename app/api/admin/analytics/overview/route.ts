import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { subDays, startOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';
    
    // Parse date range
    const days = parseInt(range.replace('d', ''));
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = new Date();

    // Get total players count
    const { count: totalPlayers } = await supabase
      .from('cinamini_user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get daily active users for today
    const { data: dauData } = await supabase
      .from('cinamini_user_stats')
      .select('user_id')
      .gte('last_played_date', startOfDay(new Date()).toISOString())
      .lte('last_played_date', endDate.toISOString());

    const dailyActiveUsers = dauData?.length || 0;

    // Get monthly active users
    const { data: mauData } = await supabase
      .from('cinamini_user_stats')
      .select('user_id')
      .gte('last_played_date', subDays(new Date(), 30).toISOString());

    const monthlyActiveUsers = mauData?.length || 0;

    // Get total games played across all game types
    const [retitledGames, budgetBracketGames, castClimbGames] = await Promise.all([
      supabase
        .from('retitled_guesses')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('budget_bracket_games')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('cast_climb_guesses')
        .select('user_id, puzzle_id')
        .then(result => {
          // Count unique user-puzzle combinations for Cast Climb
          const uniqueGames = new Set(
            result.data?.map(g => `${g.user_id}-${g.puzzle_id}`) || []
          );
          return { count: uniqueGames.size };
        })
    ]);

    const totalGamesPlayed = (retitledGames.count || 0) + 
                           (budgetBracketGames.count || 0) + 
                           (castClimbGames.count || 0);

    // Calculate average session duration (in seconds)
    // This is a simplified calculation - in production you'd track actual session times
    let avgSessionDuration = 180; // Default 3 minutes
    
    try {
      // Instead of using the placeholder RPC, calculate from actual game data
      // Get average solve times from each game type
      const [retitledAvg, budgetAvg, castClimbAvg] = await Promise.all([
        // Retitled average solve time
        supabase
          .from('retitled_guesses')
          .select('solve_time_ms')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .not('solve_time_ms', 'is', null)
          .then(result => {
            if (result.data && result.data.length > 0) {
              const totalMs = result.data.reduce((sum, g) => sum + (g.solve_time_ms || 0), 0);
              return totalMs / result.data.length / 1000; // Convert to seconds
            }
            return 0;
          }),
        
        // Budget Bracket average duration
        supabase
          .from('budget_bracket_games')
          .select('total_duration_ms')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .not('total_duration_ms', 'is', null)
          .then(result => {
            if (result.data && result.data.length > 0) {
              const totalMs = result.data.reduce((sum, g) => sum + (g.total_duration_ms || 0), 0);
              return totalMs / result.data.length / 1000; // Convert to seconds
            }
            return 0;
          }),
        
        // Cast Climb average solve time
        supabase
          .from('cast_climb_guesses')
          .select('solve_time_ms')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .eq('is_correct', true)
          .not('solve_time_ms', 'is', null)
          .then(result => {
            if (result.data && result.data.length > 0) {
              const totalMs = result.data.reduce((sum, g) => sum + (g.solve_time_ms || 0), 0);
              return totalMs / result.data.length / 1000; // Convert to seconds
            }
            return 0;
          })
      ]);

      // Calculate weighted average based on actual game plays
      const avgTimes = [retitledAvg, budgetAvg, castClimbAvg].filter(t => t > 0);
      if (avgTimes.length > 0) {
        avgSessionDuration = Math.round(avgTimes.reduce((sum, t) => sum + t, 0) / avgTimes.length);
        
        // Ensure reasonable bounds (30 seconds to 10 minutes)
        avgSessionDuration = Math.max(30, Math.min(600, avgSessionDuration));
      }
    } catch (error) {
      console.log('Using default session duration due to error:', error);
    }

    // Calculate week-over-week growth
    const { data: lastWeekDau } = await supabase
      .from('cinamini_user_stats')
      .select('user_id')
      .gte('last_played_date', subDays(new Date(), 7).toISOString())
      .lt('last_played_date', startOfDay(new Date()).toISOString());

    const lastWeekUsers = lastWeekDau?.length || 1; // Avoid division by zero
    const weekOverWeekGrowth = ((dailyActiveUsers - lastWeekUsers) / lastWeekUsers) * 100;

    return NextResponse.json({
      totalPlayers: totalPlayers || 0,
      dailyActiveUsers,
      monthlyActiveUsers,
      avgSessionDuration,
      totalGamesPlayed,
      weekOverWeekGrowth
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}