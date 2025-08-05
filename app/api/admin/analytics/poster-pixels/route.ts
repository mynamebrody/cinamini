import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';
    
    const days = parseInt(range.replace('d', ''));
    const startDate = subDays(new Date(), days);

    // Get Poster Pixels analytics
    const posterPixelsAnalytics = await getPosterPixelsAnalytics(supabase, startDate, days);

    return NextResponse.json(posterPixelsAnalytics);

  } catch (error) {
    console.error('Poster Pixels analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Poster Pixels analytics' },
      { status: 500 }
    );
  }
}

async function getPosterPixelsAnalytics(supabase: any, startDate: Date, days: number) {
  // Get all games in the date range
  const { data: games, count: totalGames } = await supabase
    .from('poster_pixels_games')
    .select(`
      *,
      poster_pixels_puzzles (
        puzzle_date,
        movie_title,
        difficulty_level
      ),
      poster_pixels_guesses (
        id,
        clarity_level,
        is_correct,
        created_at
      )
    `, { count: 'exact' })
    .gte('created_at', startDate.toISOString());

  // Calculate key metrics
  const completedGames = games?.filter((g: any) => g.is_completed).length || 0;
  const wonGames = games?.filter((g: any) => g.is_won).length || 0;
  const completionRate = totalGames ? completedGames / totalGames : 0;
  const winRate = completedGames ? wonGames / completedGames : 0;

  // Calculate average solve time for won games
  const solveTimes = games
    ?.filter((g: any) => g.is_won && g.total_time_ms)
    .map((g: any) => g.total_time_ms) || [];
  
  const avgSolveTime = solveTimes.length > 0
    ? solveTimes.reduce((a: number, b: number) => a + b, 0) / solveTimes.length / 1000
    : 0;

  // Calculate average clarity level reached (for won games)
  const clarityLevels = games
    ?.filter((g: any) => g.is_won)
    .map((g: any) => g.clarity_level_reached) || [];
  
  const avgClarityLevel = clarityLevels.length > 0
    ? clarityLevels.reduce((a: number, b: number) => a + b, 0) / clarityLevels.length
    : 3;

  // Get clarity level distribution
  const clarityDistribution = [
    { level: 'Blurriest', count: 0 },
    { level: 'Very Blurry', count: 0 },
    { level: 'Blurry', count: 0 },
    { level: 'Less Blurry', count: 0 },
    { level: 'Clear', count: 0 },
    { level: 'Clearest', count: 0 }
  ];

  games?.forEach((game: any) => {
    if (game.is_won && game.clarity_level_reached !== null) {
      clarityDistribution[game.clarity_level_reached - 1].count++;
    }
  });

  // Get daily stats
  const dailyStats = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayGames = games?.filter((g: any) => 
      g.created_at.startsWith(dateStr)
    ) || [];

    dailyStats.push({
      date: dateStr,
      totalGames: dayGames.length,
      completedGames: dayGames.filter((g: any) => g.is_completed).length,
      wonGames: dayGames.filter((g: any) => g.is_won).length
    });
  }

  // Get user stats
  const { data: userStats } = await supabase
    .from('poster_pixels_user_stats')
    .select('*')
    .order('games_won', { ascending: false })
    .limit(10);

  // Get popular movies
  const movieCounts = new Map();
  games?.forEach((game: any) => {
    const movie = game.poster_pixels_puzzles?.movie_title;
    if (movie) {
      movieCounts.set(movie, (movieCounts.get(movie) || 0) + 1);
    }
  });

  const popularMovies = Array.from(movieCounts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get perfect games (won on first clarity level)
  const perfectGames = games?.filter((g: any) => 
    g.is_won && g.clarity_level_reached === 1
  ).length || 0;

  // Calculate average difficulty
  const difficulties = games
    ?.map((g: any) => g.poster_pixels_puzzles?.difficulty_level)
    .filter((d: any) => d !== null && d !== undefined) || [];
  
  const avgDifficulty = difficulties.length > 0
    ? difficulties.reduce((a: number, b: number) => a + b, 0) / difficulties.length
    : 3;

  return {
    overview: {
      totalGames: totalGames || 0,
      completedGames,
      wonGames,
      completionRate,
      winRate,
      avgSolveTime,
      avgClarityLevel,
      avgDifficulty,
      perfectGames
    },
    clarityDistribution,
    dailyStats: dailyStats.reverse(),
    topPlayers: userStats?.map((s: any) => ({
      userId: s.user_id,
      gamesPlayed: s.games_played,
      gamesWon: s.games_won,
      winRate: s.games_played > 0 ? (s.games_won / s.games_played * 100).toFixed(1) : '0',
      avgTime: s.average_time_ms ? (s.average_time_ms / 1000).toFixed(1) : '-',
      bestTime: s.best_time_ms ? (s.best_time_ms / 1000).toFixed(1) : '-'
    })) || [],
    popularMovies
  };
}