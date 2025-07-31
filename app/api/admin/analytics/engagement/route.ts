import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { subDays, startOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';
    
    const days = parseInt(range.replace('d', ''));
    const startDate = subDays(new Date(), days);

    // Get daily active users over time
    const dailyActiveUsers = await getDailyActiveUsers(supabase, days);

    // Get game popularity distribution
    const gamePopularity = await getGamePopularity(supabase, startDate);

    // Get retention cohorts
    const retentionCohorts = await getRetentionCohorts(supabase);

    // Get streak distribution
    const streakDistribution = await getStreakDistribution(supabase);

    return NextResponse.json({
      dailyActiveUsers,
      gamePopularity,
      retentionCohorts,
      streakDistribution
    });

  } catch (error) {
    console.error('Engagement analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement analytics' },
      { status: 500 }
    );
  }
}

async function getDailyActiveUsers(supabase: any, days: number) {
  const dates = [];
  const today = new Date();
  
  // Generate date array
  for (let i = days - 1; i >= 0; i--) {
    dates.push(startOfDay(subDays(today, i)));
  }

  // Get user activity for each day
  const dailyData = await Promise.all(
    dates.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get all users who played any game on this date
      const [retitled, budgetBracket, castClimb] = await Promise.all([
        supabase
          .from('retitled_guesses')
          .select('user_id')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDay.toISOString()),
        supabase
          .from('budget_bracket_games')
          .select('user_id')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDay.toISOString()),
        supabase
          .from('cast_climb_guesses')
          .select('user_id')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDay.toISOString())
      ]);

      // Combine and deduplicate users
      const allUsers = new Set([
        ...(retitled.data?.map((r: any) => r.user_id) || []),
        ...(budgetBracket.data?.map((b: any) => b.user_id) || []),
        ...(castClimb.data?.map((c: any) => c.user_id) || [])
      ]);

      // Get new users for this day
      const { count: newUsers } = await supabase
        .from('cinamini_user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDay.toISOString());

      return {
        date: format(date, 'yyyy-MM-dd'),
        users: allUsers.size,
        newUsers: newUsers || 0
      };
    })
  );

  return dailyData;
}

async function getGamePopularity(supabase: any, startDate: Date) {
  // Get play counts for each game
  const [retitledCount, budgetBracketCount, castClimbCount] = await Promise.all([
    supabase
      .from('retitled_guesses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('budget_bracket_games')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('cast_climb_guesses')
      .select('user_id, puzzle_id')
      .gte('created_at', startDate.toISOString())
      .then(result => {
        // Count unique games for Cast Climb
        const uniqueGames = new Set(
          result.data?.map((g: any) => `${g.user_id}-${g.puzzle_id}`) || []
        );
        return { count: uniqueGames.size };
      })
  ]);

  const totalPlays = (retitledCount.count || 0) + 
                    (budgetBracketCount.count || 0) + 
                    (castClimbCount.count || 0);

  const games = [
    {
      game: 'Retitled',
      plays: retitledCount.count || 0,
      percentage: totalPlays ? Math.round(((retitledCount.count || 0) / totalPlays) * 100) : 0
    },
    {
      game: 'Budget Bracket',
      plays: budgetBracketCount.count || 0,
      percentage: totalPlays ? Math.round(((budgetBracketCount.count || 0) / totalPlays) * 100) : 0
    },
    {
      game: 'Cast Climb',
      plays: castClimbCount.count || 0,
      percentage: totalPlays ? Math.round(((castClimbCount.count || 0) / totalPlays) * 100) : 0
    }
  ];

  return games.sort((a, b) => b.plays - a.plays);
}

async function getRetentionCohorts(supabase: any) {
  // Get retention data for the last 4 weekly cohorts
  const cohorts = [];
  const today = new Date();

  for (let week = 0; week < 4; week++) {
    const cohortStart = startOfDay(subDays(today, (week + 1) * 7));
    const cohortEnd = startOfDay(subDays(today, week * 7));

    // Get users who signed up in this cohort
    const { data: cohortUsers } = await supabase
      .from('cinamini_user_profiles')
      .select('user_id')
      .gte('created_at', cohortStart.toISOString())
      .lt('created_at', cohortEnd.toISOString());

    if (!cohortUsers || cohortUsers.length === 0) {
      continue;
    }

    const userIds = cohortUsers.map((u: any) => u.user_id);

    // Check retention at day 1, 7, and 30
    const day1 = await getRetentionForDay(supabase, userIds, cohortStart, 1);
    const day7 = await getRetentionForDay(supabase, userIds, cohortStart, 7);
    const day30 = await getRetentionForDay(supabase, userIds, cohortStart, 30);

    cohorts.push({
      cohort: format(cohortStart, 'MMM d'),
      day1: (day1 / userIds.length) * 100,
      day7: (day7 / userIds.length) * 100,
      day30: (day30 / userIds.length) * 100
    });
  }

  return cohorts.reverse();
}

async function getRetentionForDay(supabase: any, userIds: string[], cohortStart: Date, dayOffset: number) {
  const targetDate = new Date(cohortStart);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Check if users played on the target day
  const [retitled, budgetBracket, castClimb] = await Promise.all([
    supabase
      .from('retitled_guesses')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', targetDate.toISOString())
      .lt('created_at', nextDay.toISOString()),
    supabase
      .from('budget_bracket_games')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', targetDate.toISOString())
      .lt('created_at', nextDay.toISOString()),
    supabase
      .from('cast_climb_guesses')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', targetDate.toISOString())
      .lt('created_at', nextDay.toISOString())
  ]);

  const activeUsers = new Set([
    ...(retitled.data?.map((r: any) => r.user_id) || []),
    ...(budgetBracket.data?.map((b: any) => b.user_id) || []),
    ...(castClimb.data?.map((c: any) => c.user_id) || [])
  ]);

  return activeUsers.size;
}

async function getStreakDistribution(supabase: any) {
  // Get streak data from user stats
  const { data: streakData } = await supabase
    .from('cinamini_user_stats')
    .select('current_daily_streak')
    .gt('current_daily_streak', 0)
    .order('current_daily_streak', { ascending: true });

  // Group by streak length
  const distribution = new Map();
  const ranges = [
    { label: '1 day', min: 1, max: 1 },
    { label: '2-3 days', min: 2, max: 3 },
    { label: '4-7 days', min: 4, max: 7 },
    { label: '8-14 days', min: 8, max: 14 },
    { label: '15-30 days', min: 15, max: 30 },
    { label: '30+ days', min: 31, max: Infinity }
  ];

  ranges.forEach(range => {
    distribution.set(range.label, 0);
  });

  streakData?.forEach((user: any) => {
    const streak = user.current_daily_streak;
    const range = ranges.find(r => streak >= r.min && streak <= r.max);
    if (range) {
      distribution.set(range.label, distribution.get(range.label) + 1);
    }
  });

  return Array.from(distribution.entries()).map(([streakLength, users]) => ({
    streakLength,
    users
  }));
}