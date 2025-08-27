/**
 * Cast Climb Game Logic and Utilities
 * 
 * This module implements the Cast Climb game (movie cast guessing) 
 * using the unified seeding system and movie pool manager for deterministic 
 * daily puzzle generation with TMDB cast integration.
 */

import { 
  generateDailySeed, 
  SeededRandom, 
  type SeedableGameItem 
} from './game-seeding';
import { 
  getMovieCredits, 
  getMovieDetails,
  type TMDBMovie,
  type TMDBCast,
  type TMDBMovieDetails 
} from './tmdb';
import { getBlendedMoviePool } from './tmdb-trending';

// ============================================================================
// CORE INTERFACES AND TYPES
// ============================================================================

export interface CastClimbMovie extends SeedableGameItem {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  popularity: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  is_trending?: boolean;
}

export interface CastClimbActor {
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
  tmdb_id: number;
}

export interface CastClimbPuzzle {
  id: string;
  puzzle_date: string;
  puzzle_number: number;
  seed_value: string;
  film_id: number;
  film_title: string;
  film_poster_url: string | null;
  film_release_year: number;
  actors: CastClimbActor[];
  total_actors: number;
  difficulty_level: number;
  fun_fact: string | null;
}

export interface CastClimbGuess {
  id: string;
  user_id: string;
  puzzle_id: string;
  guess_film_id: number;
  guess_film_title: string;
  guess_film_year?: string | null;
  is_correct: boolean;
  actors_revealed: number;
  solve_time_ms: number | null;
  attempt_number: number;
  created_at: string;
}

export interface CastClimbResult {
  correct: boolean;
  puzzle: CastClimbPuzzle;
  user_guesses: CastClimbGuess[];
  stats: {
    games_played: number;
    games_won: number;
    current_streak: number;
    longest_streak: number;
    perfect_games: number;
    average_actors_revealed: number;
  };
  share_text: string;
}

// ============================================================================
// GAME CONSTANTS AND CONFIGURATION
// ============================================================================

export const CAST_CLIMB_CONFIG = {
  ACTORS_TO_SHOW: 4,
  MIN_CAST_SIZE: 6,
  MIN_VOTE_COUNT: 100,
  MIN_POPULARITY: 5,
  DIFFICULTY_LEVELS: {
    EASY: 1,
    MEDIUM: 2,
    HARD: 3
  },
  SHARE_EMOJIS: {
    CORRECT: '✅',
    INCORRECT: '❌'
  }
} as const;

// Movie genres that work well for cast-based guessing
export const PREFERRED_GENRES = [
  28,   // Action
  12,   // Adventure
  16,   // Animation
  35,   // Comedy
  80,   // Crime
  18,   // Drama
  14,   // Fantasy
  27,   // Horror
  9648, // Mystery
  10749,// Romance
  878,  // Science Fiction
  53,   // Thriller
  10752 // War
];

// ============================================================================
// SEEDING AND PUZZLE GENERATION
// ============================================================================

/**
 * Generate deterministic seed for Cast Climb based on date
 */
export function generateCastClimbSeed(date: Date): string {
  return generateDailySeed(date, { gameId: 'cast-climb' });
}

/**
 * Calculate puzzle number based on game launch date
 * @deprecated Use calculatePuzzleNumberForGame from puzzle-numbering.ts instead
 * This function is kept for backward compatibility but should not be used for new puzzles
 */
export function calculatePuzzleNumber(date: Date): number {
  const launchDate = new Date('2025-07-28'); // Cast Climb launch date
  const diffTime = date.getTime() - launchDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Filter movies suitable for Cast Climb puzzles
 */
export function filterCastClimbMovies(movies: TMDBMovie[]): CastClimbMovie[] {
  return movies
    .filter(movie => 
      !movie.adult &&
      movie.vote_count >= CAST_CLIMB_CONFIG.MIN_VOTE_COUNT &&
      movie.popularity >= CAST_CLIMB_CONFIG.MIN_POPULARITY &&
      movie.poster_path && // Must have poster
      movie.release_date && // Must have release date
      movie.original_language === 'en' // English movies work best for cast recognition
    )
    .map(movie => ({
      ...movie,
      tmdb_id: movie.id
    }));
}

/**
 * Determine difficulty level based on movie popularity and cast familiarity
 */
export function calculateDifficulty(
  movie: CastClimbMovie, 
  cast: TMDBCast[]
): number {
  const popularityScore = movie.popularity;
  const mainCastPopularity = cast.slice(0, 4).reduce((sum, actor) => 
    sum + (actor.popularity || 0), 0
  ) / 4;

  // Higher popularity = easier
  if (popularityScore > 50 && mainCastPopularity > 10) {
    return CAST_CLIMB_CONFIG.DIFFICULTY_LEVELS.EASY;
  } else if (popularityScore > 20 && mainCastPopularity > 5) {
    return CAST_CLIMB_CONFIG.DIFFICULTY_LEVELS.MEDIUM;
  } else {
    return CAST_CLIMB_CONFIG.DIFFICULTY_LEVELS.HARD;
  }
}

/**
 * Generate a fun fact about the movie or cast
 */
export function generateFunFact(
  movie: TMDBMovieDetails,
  cast: TMDBCast[]
): string | null {
  const facts = [];
  
  // Budget facts
  if (movie.budget && movie.budget > 1000000) {
    facts.push(`This movie had a budget of $${(movie.budget / 1000000).toFixed(0)} million.`);
  }
  
  // Box office facts
  if (movie.revenue && movie.revenue > movie.budget * 2) {
    facts.push(`This film earned over ${Math.floor(movie.revenue / movie.budget)}x its budget at the box office.`);
  }
  
  // Cast facts
  const leadActor = cast[0];
  if (leadActor) {
    facts.push(`${leadActor.name} played the character "${leadActor.character}".`);
  }
  
  // Awards facts (basic)
  if (movie.vote_average > 8.0) {
    facts.push(`This highly acclaimed film has a rating of ${movie.vote_average}/10.`);
  }
  
  if (facts.length === 0) {
    return null;
  }
  
  // Randomly select one fact
  const randomIndex = Math.floor(Math.random() * facts.length);
  return facts[randomIndex];
}

/**
 * Generate today's Cast Climb puzzle using deterministic seeding
 */
export async function generateDailyPuzzle(
  date: Date = new Date(),
  puzzleNumber?: number
): Promise<CastClimbPuzzle> {
  const seed = generateCastClimbSeed(date);
  const rng = new SeededRandom(seed);
  // Use provided puzzle number or fall back to old calculation (for backward compatibility)
  const actualPuzzleNumber = puzzleNumber ?? calculatePuzzleNumber(date);
  
  // Get movie pool with blended trending/classic mix
  const moviePool = await getBlendedMoviePool();
  const castClimbMovies = filterCastClimbMovies(moviePool);
  
  if (castClimbMovies.length === 0) {
    throw new Error('No suitable movies found for Cast Climb puzzle');
  }
  
  // Select random movie using seeded RNG
  const selectedMovie = rng.choice(castClimbMovies);
  
  // Get cast and movie details from TMDB
  const [castData, movieDetails] = await Promise.all([
    getMovieCredits(selectedMovie.tmdb_id),
    getMovieDetails(selectedMovie.tmdb_id)
  ]);
  
  if (!castData?.cast || castData.cast.length < CAST_CLIMB_CONFIG.MIN_CAST_SIZE) {
    throw new Error(`Movie ${selectedMovie.title} doesn't have enough cast members`);
  }
  
  // Filter and select top actors
  const topCast = castData.cast
    .filter((actor: TMDBCast) => 
      actor.name && 
      actor.character && 
      actor.order < 20 // Focus on main cast
    )
    .slice(0, CAST_CLIMB_CONFIG.ACTORS_TO_SHOW);
  
  if (topCast.length < CAST_CLIMB_CONFIG.ACTORS_TO_SHOW) {
    throw new Error(`Movie ${selectedMovie.title} doesn't have enough named cast members`);
  }
  
  // Convert to CastClimbActor format and reverse order (start with supporting actors, end with leads)
  const actors: CastClimbActor[] = topCast.map((actor: TMDBCast) => ({
    name: actor.name,
    character: actor.character,
    order: actor.order,
    profile_path: actor.profile_path,
    tmdb_id: actor.id
  })).reverse();
  
  const difficulty = calculateDifficulty(selectedMovie, topCast);
  const funFact = generateFunFact(movieDetails, topCast);
  
  return {
    id: '', // Will be set by database
    puzzle_date: date.toISOString().split('T')[0],
    puzzle_number: actualPuzzleNumber,
    seed_value: seed,
    film_id: selectedMovie.tmdb_id,
    film_title: selectedMovie.title,
    film_poster_url: selectedMovie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}` 
      : null,
    film_release_year: new Date(selectedMovie.release_date).getFullYear(),
    actors,
    total_actors: actors.length,
    difficulty_level: difficulty,
    fun_fact: funFact
  };
}

// ============================================================================
// GAME MECHANICS AND VALIDATION
// ============================================================================

/**
 * Validate if a puzzle has the required data structure
 */
export function validatePuzzleData(puzzle: any): puzzle is CastClimbPuzzle {
  return (
    puzzle &&
    typeof puzzle.film_id === 'number' &&
    typeof puzzle.film_title === 'string' &&
    Array.isArray(puzzle.actors) &&
    puzzle.actors.length >= CAST_CLIMB_CONFIG.ACTORS_TO_SHOW &&
    puzzle.actors.every((actor: any) => 
      typeof actor.name === 'string' && 
      typeof actor.character === 'string'
    )
  );
}

/**
 * Generate share text for social media
 */
export function generateShareText(
  puzzleNumber: number,
  guesses: CastClimbGuess[],
  isWin: boolean,
  studioTimeMs?: number
): string {
  let pattern = '';
  let resultText = '';
  
  if (isWin) {
    // New pattern logic:
    // - Wrong attempts shown as person emojis 🧑 (one per wrong guess before the win)
    // - Then a ✅ when correct
    // - Then remaining reveals as 🎭 until 4 total reveals
    const wrongAttemptsBeforeWin = Math.max(0, guesses.length - 1);
    const remainingActors = Math.max(0, CAST_CLIMB_CONFIG.ACTORS_TO_SHOW - guesses.length);

    pattern = '🧑'.repeat(wrongAttemptsBeforeWin) + 
              '✅' + 
              '🎭'.repeat(remainingActors);
              
    if (guesses.length === 1) {
      resultText = '\nGot the 🎬 on the first try! 🥇';
    } else {
      resultText = `\nGot the 🎬 in ${guesses.length} guesses`;
    }
  } else {
    // Loss pattern: four faces then a red X
    // Example: 🧑🧑🧑🧑❌
    pattern = '🧑'.repeat(CAST_CLIMB_CONFIG.ACTORS_TO_SHOW) + '❌';
    resultText = "\nWasn't able to get the movie."
  }
  
  // Add studio time if provided
  let timeText = '';
  if (studioTimeMs !== undefined) {
    const totalSeconds = Math.floor(studioTimeMs / 1000);
    if (totalSeconds < 60) {
      timeText = ` • ${totalSeconds}s`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      timeText = ` • ${minutes}m ${seconds}s`;
    }
  }

  return `Cast Climb #${puzzleNumber} ${pattern}${timeText}\n${resultText}`;
}

/**
 * Calculate user statistics after a game
 */
export function calculateUserStats(
  currentStats: any,
  gameResult: { isWin: boolean; actorsRevealed: number; solveTimeMs?: number }
): any {
  const stats = {
    games_played: (currentStats?.games_played || 0) + 1,
    games_won: (currentStats?.games_won || 0) + (gameResult.isWin ? 1 : 0),
    total_guesses: (currentStats?.total_guesses || 0) + gameResult.actorsRevealed,
    perfect_games: (currentStats?.perfect_games || 0) + 
      (gameResult.isWin && gameResult.actorsRevealed === 1 ? 1 : 0),
  };
  
  // Update streaks
  if (gameResult.isWin) {
    stats.current_streak = (currentStats?.current_streak || 0) + 1;
    stats.longest_streak = Math.max(
      stats.current_streak,
      currentStats?.longest_streak || 0
    );
  } else {
    stats.current_streak = 0;
  }
  
  // Calculate averages
  if (stats.games_won > 0) {
    const prevAvgActors = currentStats?.average_actors_revealed || 0;
    const prevWonGames = currentStats?.games_won || 0;
    
    if (gameResult.isWin) {
      stats.average_actors_revealed = 
        ((prevAvgActors * prevWonGames) + gameResult.actorsRevealed) / stats.games_won;
    } else {
      stats.average_actors_revealed = prevAvgActors;
    }
  }
  
  // Update solve times
  if (gameResult.isWin && gameResult.solveTimeMs) {
    const prevAvgTime = currentStats?.average_solve_time_ms || 0;
    const prevWonGames = currentStats?.games_won || 0;
    
    stats.average_solve_time_ms = 
      ((prevAvgTime * prevWonGames) + gameResult.solveTimeMs) / stats.games_won;
    
    stats.best_solve_time_ms = Math.min(
      gameResult.solveTimeMs,
      currentStats?.best_solve_time_ms || Infinity
    );
  }
  
  return stats;
}

// ============================================================================
// EXPORT EVERYTHING
// ============================================================================

export type {
  CastClimbMovie,
  CastClimbActor,
  CastClimbPuzzle,
  CastClimbGuess,
  CastClimbResult
};

export {
  SeededRandom
};