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

    // Get metrics for each game
    const gameMetrics = await Promise.all([
      // Retitled metrics
      getRetitledMetrics(supabase, startDate),
      // Budget Bracket metrics
      getBudgetBracketMetrics(supabase, startDate),
      // Cast Climb metrics
      getCastClimbMetrics(supabase, startDate)
    ]);

    return NextResponse.json(gameMetrics);

  } catch (error) {
    console.error('Game analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game analytics' },
      { status: 500 }
    );
  }
}

async function getRetitledMetrics(supabase: any, startDate: Date) {
  // Get total plays and completion rate
  const { data: guesses, count: totalPlays } = await supabase
    .from('retitled_guesses')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate.toISOString());

  const correctGuesses = guesses?.filter((g: any) => g.is_correct).length || 0;
  const completionRate = totalPlays ? correctGuesses / totalPlays : 0;

  // Get average solve time (only for correct guesses)
  const correctTimes = guesses
    ?.filter((g: any) => g.is_correct && g.solve_time_ms)
    .map((g: any) => g.solve_time_ms) || [];
  
  const avgSolveTime = correctTimes.length > 0
    ? correctTimes.reduce((a: number, b: number) => a + b, 0) / correctTimes.length / 1000 // Convert to seconds
    : 0;

  // Get difficulty data from puzzles
  const { data: puzzles } = await supabase
    .from('retitled_puzzles')
    .select('difficulty_level')
    .gte('puzzle_date', startDate.toISOString());

  const avgDifficulty = puzzles?.length > 0
    ? puzzles.reduce((sum: number, p: any) => sum + (p.difficulty_level || 3), 0) / puzzles.length
    : 3;

  // Get popular puzzles
  const { data: popularPuzzles } = await supabase
    .from('retitled_guesses')
    .select('puzzle_id, retitled_puzzles(puzzle_date, film_title)')
    .gte('created_at', startDate.toISOString())
    .eq('is_correct', true)
    .order('created_at', { ascending: false })
    .limit(5);

  // Count perfect games (correct on first try - for Retitled this is all correct guesses)
  const perfectGames = correctGuesses;

  return {
    gameId: 'retitled',
    displayName: 'Retitled',
    completionRate,
    avgSolveTime,
    avgDifficulty,
    totalPlays: totalPlays || 0,
    perfectGames,
    popularPuzzles: popularPuzzles?.map((p: any) => ({
      date: p.retitled_puzzles?.puzzle_date,
      plays: 1, // Would need aggregation for real counts
      title: p.retitled_puzzles?.film_title
    })) || []
  };
}

async function getBudgetBracketMetrics(supabase: any, startDate: Date) {
  // Get total games and perfect games
  const { data: games, count: totalPlays } = await supabase
    .from('budget_bracket_games')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate.toISOString());

  const perfectGames = games?.filter((g: any) => g.is_perfect_game).length || 0;
  const completionRate = totalPlays ? games.length / totalPlays : 0; // All submitted games are "complete"

  // Get average duration
  const durations = games
    ?.filter((g: any) => g.total_duration_ms)
    .map((g: any) => g.total_duration_ms) || [];
  
  const avgSolveTime = durations.length > 0
    ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length / 1000
    : 0;

  // Calculate average rounds reached
  const roundsReached = games?.map((g: any) => g.rounds_completed) || [];
  const avgDifficulty = roundsReached.length > 0
    ? 5 - (roundsReached.reduce((a: number, b: number) => a + b, 0) / roundsReached.length) // Convert to difficulty scale
    : 3;

  return {
    gameId: 'budget-bracket',
    displayName: 'Budget Bracket',
    completionRate,
    avgSolveTime,
    avgDifficulty,
    totalPlays: totalPlays || 0,
    perfectGames,
    popularPuzzles: []
  };
}

async function getCastClimbMetrics(supabase: any, startDate: Date) {
  // Get all guesses
  const { data: guesses } = await supabase
    .from('cast_climb_guesses')
    .select('*')
    .gte('created_at', startDate.toISOString());

  // Group by user and puzzle to get unique games
  const gameMap = new Map();
  guesses?.forEach((guess: any) => {
    const key = `${guess.user_id}-${guess.puzzle_id}`;
    if (!gameMap.has(key)) {
      gameMap.set(key, []);
    }
    gameMap.get(key).push(guess);
  });

  const totalPlays = gameMap.size;
  const games = Array.from(gameMap.values());
  
  // Calculate completion rate (games where player eventually got it right)
  const completedGames = games.filter(gameGuesses => 
    gameGuesses.some((g: any) => g.is_correct)
  ).length;
  const completionRate = totalPlays ? completedGames / totalPlays : 0;

  // Calculate average solve time for successful games
  const solveTimes = games
    .filter(gameGuesses => gameGuesses.some((g: any) => g.is_correct))
    .map(gameGuesses => {
      const correctGuess = gameGuesses.find((g: any) => g.is_correct);
      return correctGuess?.solve_time_ms || 0;
    })
    .filter(time => time > 0);

  const avgSolveTime = solveTimes.length > 0
    ? solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length / 1000
    : 0;

  // Calculate average actors revealed (difficulty proxy)
  const actorsRevealed = games
    .filter(gameGuesses => gameGuesses.some((g: any) => g.is_correct))
    .map(gameGuesses => {
      const correctGuess = gameGuesses.find((g: any) => g.is_correct);
      return correctGuess?.actors_revealed || 4;
    });

  const avgActorsRevealed = actorsRevealed.length > 0
    ? actorsRevealed.reduce((a, b) => a + b, 0) / actorsRevealed.length
    : 2.5;

  const avgDifficulty = avgActorsRevealed; // 1-4 scale maps nicely to difficulty

  // Count perfect games (guessed on first actor)
  const perfectGames = games.filter(gameGuesses => 
    gameGuesses.length === 1 && gameGuesses[0].is_correct && gameGuesses[0].actors_revealed === 1
  ).length;

  return {
    gameId: 'cast-climb',
    displayName: 'Cast Climb',
    completionRate,
    avgSolveTime,
    avgDifficulty,
    totalPlays,
    perfectGames,
    popularPuzzles: []
  };
}