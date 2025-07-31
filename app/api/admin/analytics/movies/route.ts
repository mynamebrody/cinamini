import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';

// Genre mapping from TMDB
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';
    
    const days = parseInt(range.replace('d', ''));
    const startDate = subDays(new Date(), days);

    // Get most used movies
    const mostUsedMovies = await getMostUsedMovies(supabase, startDate);

    // Get genre popularity
    const genrePopularity = await getGenrePopularity(supabase, startDate);

    // Get release year trends
    const releaseYearTrends = await getReleaseYearTrends(supabase, startDate);

    // Get budget vs engagement correlation
    const budgetEngagement = await getBudgetEngagement(supabase, startDate);

    return NextResponse.json({
      mostUsedMovies,
      genrePopularity,
      releaseYearTrends,
      budgetEngagement
    });

  } catch (error) {
    console.error('Movie analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie analytics' },
      { status: 500 }
    );
  }
}

async function getMostUsedMovies(supabase: any, startDate: Date) {
  // Get movies from all games
  const [retitledMovies, budgetBracketMovies, castClimbMovies] = await Promise.all([
    // Retitled movies
    supabase
      .from('retitled_puzzles')
      .select('film_id, film_title')
      .gte('puzzle_date', startDate.toISOString()),
    
    // Budget Bracket movies (stored in JSON)
    supabase
      .from('budget_bracket_puzzles')
      .select('pairs')
      .gte('puzzle_date', startDate.toISOString()),
    
    // Cast Climb movies
    supabase
      .from('cast_climb_puzzles')
      .select('film_id, film_title')
      .gte('puzzle_date', startDate.toISOString())
  ]);

  // Count movie usage
  const movieUsage = new Map();

  // Process Retitled movies
  retitledMovies.data?.forEach((movie: any) => {
    const key = `${movie.film_id}-${movie.film_title}`;
    movieUsage.set(key, (movieUsage.get(key) || 0) + 1);
  });

  // Process Budget Bracket movies
  budgetBracketMovies.data?.forEach((puzzle: any) => {
    puzzle.pairs?.forEach((pair: any) => {
      [pair.movie1, pair.movie2].forEach((movie: any) => {
        if (movie) {
          const key = `${movie.id}-${movie.title}`;
          movieUsage.set(key, (movieUsage.get(key) || 0) + 1);
        }
      });
    });
  });

  // Process Cast Climb movies
  castClimbMovies.data?.forEach((movie: any) => {
    const key = `${movie.film_id}-${movie.film_title}`;
    movieUsage.set(key, (movieUsage.get(key) || 0) + 1);
  });

  // Get engagement data for top movies
  const topMovies = Array.from(movieUsage.entries())
    .map(([key, count]) => {
      const [tmdbId, ...titleParts] = key.split('-');
      return {
        tmdbId: parseInt(tmdbId),
        title: titleParts.join('-'),
        usageCount: count
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 20);

  // Calculate average engagement for each movie
  const moviesWithEngagement = await Promise.all(
    topMovies.map(async (movie) => {
      // Get guess data for this movie
      const [retitledEngagement, castClimbEngagement] = await Promise.all([
        supabase
          .from('retitled_guesses')
          .select('is_correct, retitled_puzzles!inner(film_id)')
          .eq('retitled_puzzles.film_id', movie.tmdbId)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('cast_climb_guesses')
          .select('is_correct, cast_climb_puzzles!inner(film_id)')
          .eq('cast_climb_puzzles.film_id', movie.tmdbId)
          .gte('created_at', startDate.toISOString())
      ]);

      const totalGuesses = (retitledEngagement.data?.length || 0) + (castClimbEngagement.data?.length || 0);
      const correctGuesses = 
        (retitledEngagement.data?.filter((g: any) => g.is_correct).length || 0) +
        (castClimbEngagement.data?.filter((g: any) => g.is_correct).length || 0);

      const avgEngagement = totalGuesses > 0 ? (correctGuesses / totalGuesses) * 100 : 0;

      return {
        ...movie,
        avgEngagement
      };
    })
  );

  return moviesWithEngagement;
}

async function getGenrePopularity(supabase: any, startDate: Date) {
  // Get all movies used in puzzles
  const [retitledMovies, castClimbMovies] = await Promise.all([
    supabase
      .from('retitled_puzzles')
      .select('film_id')
      .gte('puzzle_date', startDate.toISOString()),
    
    supabase
      .from('cast_climb_puzzles')
      .select('film_id')
      .gte('puzzle_date', startDate.toISOString())
  ]);

  // For this example, we'll use mock genre data
  // In production, you'd fetch genre_ids from TMDB or store them in the database
  const genreCounts = new Map();
  const mockGenres = [18, 28, 35, 53, 878, 14, 27, 10749]; // Common genres

  // Simulate genre distribution
  const allMovieIds = [
    ...(retitledMovies.data?.map((m: any) => m.film_id) || []),
    ...(castClimbMovies.data?.map((m: any) => m.film_id) || [])
  ];

  allMovieIds.forEach((_, index) => {
    // Assign 1-3 random genres per movie
    const numGenres = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numGenres; i++) {
      const genreId = mockGenres[Math.floor(Math.random() * mockGenres.length)];
      const genreName = GENRE_MAP[genreId];
      genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 1);
    }
  });

  return Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

async function getReleaseYearTrends(supabase: any, startDate: Date) {
  // Get all movies with release years
  const [retitledMovies, castClimbMovies] = await Promise.all([
    supabase
      .from('retitled_puzzles')
      .select('film_id, puzzle_date')
      .gte('puzzle_date', startDate.toISOString()),
    
    supabase
      .from('cast_climb_puzzles')
      .select('film_id, film_release_year, puzzle_date')
      .gte('puzzle_date', startDate.toISOString())
  ]);

  // Group by decade
  const decadeCounts = new Map();
  const decadeEngagement = new Map();

  // Process Cast Climb movies (has release year)
  castClimbMovies.data?.forEach((movie: any) => {
    if (movie.film_release_year) {
      const decade = Math.floor(movie.film_release_year / 10) * 10;
      const decadeLabel = `${decade}s`;
      decadeCounts.set(decadeLabel, (decadeCounts.get(decadeLabel) || 0) + 1);
    }
  });

  // For Retitled, we'll simulate some decade distribution
  const decades = ['1980s', '1990s', '2000s', '2010s', '2020s'];
  retitledMovies.data?.forEach((movie: any, index: number) => {
    const decade = decades[index % decades.length];
    decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);
  });

  // Simulate engagement data by decade
  return Array.from(decadeCounts.entries())
    .map(([decade, count]) => ({
      decade,
      count,
      avgEngagement: 70 + Math.random() * 20 // Mock engagement 70-90%
    }))
    .sort((a, b) => a.decade.localeCompare(b.decade));
}

async function getBudgetEngagement(supabase: any, startDate: Date) {
  // Get Budget Bracket movies with budget data
  const { data: budgetPuzzles } = await supabase
    .from('budget_bracket_puzzles')
    .select('pairs, id')
    .gte('puzzle_date', startDate.toISOString());

  // Get game results for engagement calculation
  const { data: gameResults } = await supabase
    .from('budget_bracket_games')
    .select('puzzle_id, rounds_completed, is_perfect_game')
    .gte('created_at', startDate.toISOString());

  // Create engagement map by puzzle
  const puzzleEngagement = new Map();
  gameResults?.forEach((game: any) => {
    if (!puzzleEngagement.has(game.puzzle_id)) {
      puzzleEngagement.set(game.puzzle_id, {
        total: 0,
        perfect: 0,
        avgRounds: 0
      });
    }
    const stats = puzzleEngagement.get(game.puzzle_id);
    stats.total++;
    if (game.is_perfect_game) stats.perfect++;
    stats.avgRounds += game.rounds_completed;
  });

  // Extract movies with budgets
  const moviesWithBudget: any[] = [];
  
  budgetPuzzles?.forEach((puzzle: any) => {
    const engagement = puzzleEngagement.get(puzzle.id) || { total: 0, perfect: 0, avgRounds: 0 };
    const engagementRate = engagement.total > 0 
      ? (engagement.perfect / engagement.total) * 100 + (engagement.avgRounds / engagement.total) * 10
      : 0;

    puzzle.pairs?.forEach((pair: any) => {
      [pair.movie1, pair.movie2].forEach((movie: any) => {
        if (movie?.budget && movie.budget > 0) {
          moviesWithBudget.push({
            title: movie.title,
            budget: movie.budget,
            engagement: Math.min(100, engagementRate)
          });
        }
      });
    });
  });

  // Return a sample of movies for scatter plot
  return moviesWithBudget
    .filter(m => m.budget > 1000000) // Only movies with >$1M budget
    .sort(() => Math.random() - 0.5)
    .slice(0, 50);
}