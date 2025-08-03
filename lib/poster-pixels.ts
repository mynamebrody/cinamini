/**
 * Poster Pixels Game Logic and Utilities
 * 
 * This module implements the Poster Pixels game (movie poster guessing with progressive clarity)
 * using the unified seeding system and movie pool manager for deterministic 
 * daily puzzle generation with TMDB poster integration.
 */

import { 
  generateDailySeed, 
  SeededRandom, 
  type SeedableGameItem 
} from './game-seeding';
import { createClient } from '@/lib/supabase/server';
import { 
  getMovieById,
  getMovieDetails,
  getPosterUrl,
  type TMDBMovie,
  type TMDBMovieDetails 
} from './tmdb';
import { getBlendedMoviePool } from './tmdb-trending';

// ============================================================================
// CORE INTERFACES AND TYPES
// ============================================================================

export interface PosterPixelsMovie extends SeedableGameItem {
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

export interface PosterPixelsPuzzle {
  id: string;
  puzzle_date: string;
  puzzle_number: number;
  seed_value: string;
  film_id: number;
  film_title: string;
  film_release_year: number;
  poster_url: string;
  poster_path: string;
  difficulty_level: number;
  fun_fact: string | null;
  total_attempts: number;
}

export interface PosterPixelsGuess {
  id: string;
  user_id: string;
  puzzle_id: string;
  guess_film_id: number;
  guess_film_title: string;
  is_correct: boolean;
  clarity_level: number;
  solve_time_ms: number | null;
  attempt_number: number;
  score: number;
  created_at: string;
}

export interface PosterPixelsGameState {
  status: 'loading' | 'start' | 'playing' | 'completed' | 'stats' | 'error';
  puzzle: PosterPixelsPuzzle | null;
  guesses: PosterPixelsGuess[];
  currentClarityLevel: number;
  remainingAttempts: number;
  totalScore: number;
  isCompleted: boolean;
  isWin: boolean;
  error?: string;
}

export interface PosterPixelsUserStats {
  user_id: string;
  games_played: number;
  games_won: number;
  current_streak: number;
  longest_streak: number;
  total_guesses: number;
  perfect_games: number;
  average_clarity_level: number;
  average_score: number;
  best_score: number;
  average_solve_time_ms: number;
  best_solve_time_ms: number;
  last_played_date: string | null;
}

export interface PosterPixelsResult {
  correct: boolean;
  puzzle: PosterPixelsPuzzle;
  user_guesses: PosterPixelsGuess[];
  final_score: number;
  clarity_level_won: number | null;
  stats: PosterPixelsUserStats;
  share_text: string;
}

// ============================================================================
// GAME CONSTANTS AND CONFIGURATION
// ============================================================================

export const POSTER_PIXELS_CONFIG = {
  // Clarity levels: 5% (very pixelated) to 100% (full clarity)
  CLARITY_LEVELS: [5, 15, 35, 65, 100] as const,
  MAX_ATTEMPTS: 5,
  MIN_VOTE_COUNT: 200,
  MIN_POPULARITY: 10,
  
  // Scoring system: Higher scores for guessing at lower clarity
  SCORING: {
    CLARITY_5: 1000,   // Perfect guess at 5% clarity
    CLARITY_15: 750,   // Great guess at 15% clarity
    CLARITY_35: 500,   // Good guess at 35% clarity
    CLARITY_65: 250,   // Fair guess at 65% clarity
    CLARITY_100: 100,  // Basic guess at 100% clarity
  },
  
  DIFFICULTY_LEVELS: {
    EASY: 1,    // Popular movies with distinctive posters
    MEDIUM: 2,  // Moderately popular, some similar posters
    HARD: 3     // Less popular or visually challenging posters
  },
  
  SHARE_EMOJIS: {
    CORRECT: '✅',
    INCORRECT: '❌'
  }
} as const;

export type ClarityLevel = typeof POSTER_PIXELS_CONFIG.CLARITY_LEVELS[number];

// Movie genres that work well for poster recognition
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
 * Generate deterministic seed for Poster Pixels based on date
 */
export function generatePosterPixelsSeed(date: Date): string {
  return generateDailySeed(date, { 
    gameId: 'poster-pixels',
    gameEntropy: 'movie-posters' 
  });
}

/**
 * Calculate puzzle number based on game launch date
 */
export function calculatePuzzleNumber(date: Date): number {
  const launchDate = new Date('2025-07-31'); // Poster Pixels launch date
  const diffTime = date.getTime() - launchDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Filter movies suitable for Poster Pixels puzzles
 */
export function filterPosterPixelsMovies(movies: TMDBMovie[]): PosterPixelsMovie[] {
  return movies
    .filter(movie => 
      !movie.adult &&
      movie.vote_count >= POSTER_PIXELS_CONFIG.MIN_VOTE_COUNT &&
      movie.popularity >= POSTER_PIXELS_CONFIG.MIN_POPULARITY &&
      movie.poster_path && // Must have poster - critical for this game
      movie.release_date && // Must have release date
      movie.title && movie.title.length > 0 // Must have valid title
    )
    .map(movie => ({
      ...movie,
      tmdb_id: movie.id,
      seedValue: movie.id.toString(),
      gameRelevanceScore: movie.popularity / 100 // Normalize popularity as relevance
    }));
}

/**
 * Determine difficulty level based on movie popularity and poster distinctiveness
 */
export function calculateDifficulty(movie: PosterPixelsMovie): number {
  const popularityScore = movie.popularity;
  const voteCount = movie.vote_count;
  
  // More popular movies with more votes are generally easier to recognize
  if (popularityScore > 100 && voteCount > 1000) {
    return POSTER_PIXELS_CONFIG.DIFFICULTY_LEVELS.EASY;
  } else if (popularityScore > 30 && voteCount > 500) {
    return POSTER_PIXELS_CONFIG.DIFFICULTY_LEVELS.MEDIUM;
  } else {
    return POSTER_PIXELS_CONFIG.DIFFICULTY_LEVELS.HARD;
  }
}

/**
 * Generate a fun fact about the movie
 */
export function generateFunFact(movieDetails: TMDBMovieDetails): string | null {
  const facts = [];
  
  // Budget facts
  if (movieDetails.budget && movieDetails.budget > 1000000) {
    facts.push(`This movie had a budget of $${(movieDetails.budget / 1000000).toFixed(0)} million.`);
  }
  
  // Box office facts
  if (movieDetails.revenue && movieDetails.budget && movieDetails.revenue > movieDetails.budget * 2) {
    facts.push(`This film earned over ${Math.floor(movieDetails.revenue / movieDetails.budget)}x its budget at the box office.`);
  }
  
  // Runtime facts
  if (movieDetails.runtime && movieDetails.runtime > 180) {
    facts.push(`This epic film has a runtime of ${Math.floor(movieDetails.runtime / 60)} hours and ${movieDetails.runtime % 60} minutes.`);
  }
  
  // Rating facts
  if (movieDetails.vote_average > 8.0) {
    facts.push(`This highly acclaimed film has a rating of ${movieDetails.vote_average}/10.`);
  }
  
  // Release year facts
  const releaseYear = new Date(movieDetails.release_date).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - releaseYear;
  
  if (age > 50) {
    facts.push(`This classic film was released over ${Math.floor(age / 10) * 10} years ago in ${releaseYear}.`);
  } else if (age < 5) {
    facts.push(`This recent film was released in ${releaseYear}.`);
  }
  
  if (facts.length === 0) {
    return null;
  }
  
  // Randomly select one fact using current time as seed
  const randomIndex = Math.floor(Math.random() * facts.length);
  return facts[randomIndex];
}

/**
 * Generate today's Poster Pixels puzzle using deterministic seeding
 */
export async function generatePosterPixelsPuzzle(
  date: Date = new Date()
): Promise<PosterPixelsPuzzle> {
  const seed = generatePosterPixelsSeed(date);
  const rng = new SeededRandom(seed);
  const puzzleNumber = calculatePuzzleNumber(date);
  
  // Get movie pool with blended trending/classic mix
  const moviePool = await getBlendedMoviePool();
  const posterPixelsMovies = filterPosterPixelsMovies(moviePool);
  
  if (posterPixelsMovies.length === 0) {
    throw new Error('No suitable movies found for Poster Pixels puzzle');
  }
  
  // Select random movie using seeded RNG
  const selectedMovie = rng.choice(posterPixelsMovies);
  
  // Get detailed movie information from TMDB
  const movieDetails = await getMovieDetails(selectedMovie.tmdb_id);
  
  if (!movieDetails) {
    throw new Error(`Could not fetch details for movie ${selectedMovie.title}`);
  }
  
  // Validate poster exists
  if (!selectedMovie.poster_path) {
    throw new Error(`Movie ${selectedMovie.title} doesn't have a poster`);
  }
  
  const difficulty = calculateDifficulty(selectedMovie);
  const funFact = generateFunFact(movieDetails);
  const posterUrl = getPosterUrl(selectedMovie.poster_path, 'w500');
  
  if (!posterUrl) {
    throw new Error(`Could not generate poster URL for movie ${selectedMovie.title}`);
  }
  
  return {
    id: '', // Will be set by database
    puzzle_date: date.toISOString().split('T')[0],
    puzzle_number: puzzleNumber,
    seed_value: seed,
    film_id: selectedMovie.tmdb_id,
    film_title: selectedMovie.title,
    film_release_year: new Date(selectedMovie.release_date).getFullYear(),
    poster_url: posterUrl,
    poster_path: selectedMovie.poster_path,
    difficulty_level: difficulty,
    fun_fact: funFact,
    total_attempts: POSTER_PIXELS_CONFIG.MAX_ATTEMPTS
  };
}

// ============================================================================
// CORE GAME LOGIC FUNCTIONS
// ============================================================================

/**
 * Validate if a guess is correct
 */
export function validateGuess(puzzle: PosterPixelsPuzzle, guessId: number): boolean {
  return puzzle.film_id === guessId;
}

/**
 * Calculate score based on clarity level when correct guess was made
 */
export function calculateScore(clarityLevel: ClarityLevel): number {
  switch (clarityLevel) {
    case 5:
      return POSTER_PIXELS_CONFIG.SCORING.CLARITY_5;
    case 15:
      return POSTER_PIXELS_CONFIG.SCORING.CLARITY_15;
    case 35:
      return POSTER_PIXELS_CONFIG.SCORING.CLARITY_35;
    case 65:
      return POSTER_PIXELS_CONFIG.SCORING.CLARITY_65;
    case 100:
      return POSTER_PIXELS_CONFIG.SCORING.CLARITY_100;
    default:
      return 0;
  }
}

/**
 * Get the next clarity level after an incorrect guess
 */
export function getNextClarityLevel(currentLevel: ClarityLevel): ClarityLevel | null {
  const currentIndex = POSTER_PIXELS_CONFIG.CLARITY_LEVELS.indexOf(currentLevel);
  
  if (currentIndex === -1 || currentIndex === POSTER_PIXELS_CONFIG.CLARITY_LEVELS.length - 1) {
    return null; // No next level available
  }
  
  return POSTER_PIXELS_CONFIG.CLARITY_LEVELS[currentIndex + 1];
}

/**
 * Get the current clarity level based on attempt number
 */
export function getCurrentClarityLevel(attemptNumber: number): ClarityLevel {
  const index = Math.min(attemptNumber - 1, POSTER_PIXELS_CONFIG.CLARITY_LEVELS.length - 1);
  return POSTER_PIXELS_CONFIG.CLARITY_LEVELS[Math.max(0, index)];
}

/**
 * Check if more attempts are available
 */
export function hasAttemptsRemaining(attemptNumber: number): boolean {
  return attemptNumber < POSTER_PIXELS_CONFIG.MAX_ATTEMPTS;
}

// ============================================================================
// GAME MECHANICS AND VALIDATION
// ============================================================================

/**
 * Validate if a puzzle has the required data structure
 */
export function validatePuzzleData(puzzle: any): puzzle is PosterPixelsPuzzle {
  return (
    puzzle &&
    typeof puzzle.film_id === 'number' &&
    typeof puzzle.film_title === 'string' &&
    typeof puzzle.poster_url === 'string' &&
    typeof puzzle.poster_path === 'string' &&
    puzzle.poster_url.length > 0 &&
    puzzle.poster_path.length > 0
  );
}

/**
 * Generate share text for social media
 */
export function getPosterPixelsShareText(
  puzzle: PosterPixelsPuzzle,
  attempts: PosterPixelsGuess[]
): string {
  let pattern = '';
  let finalScore = 0;
  let clarityWon: ClarityLevel | null = null;
  let isWin = false;
  
  if (attempts.length === 0) {
    pattern = POSTER_PIXELS_CONFIG.SHARE_EMOJIS.INCORRECT.repeat(POSTER_PIXELS_CONFIG.MAX_ATTEMPTS);
  } else {
    const lastAttempt = attempts[attempts.length - 1];
    finalScore = lastAttempt.score;
    
    if (lastAttempt.is_correct) {
      // Show pattern: ❌❌✅ (failed attempts then success)
      const incorrectAttempts = attempts.length - 1;
      pattern = POSTER_PIXELS_CONFIG.SHARE_EMOJIS.INCORRECT.repeat(incorrectAttempts) + 
                POSTER_PIXELS_CONFIG.SHARE_EMOJIS.CORRECT;
      clarityWon = getCurrentClarityLevel(attempts.length);
      isWin = true;
    } else {
      // All failed attempts
      pattern = POSTER_PIXELS_CONFIG.SHARE_EMOJIS.INCORRECT.repeat(attempts.length);
    }
  }
  
  // Calculate total time
  const totalTimeMs = attempts.reduce((sum, attempt) => sum + (attempt.time_taken_ms || 0), 0);
  const totalSeconds = Math.round(totalTimeMs / 1000);
  
  // Add achievement for perfect game (1 guess win with 100% clarity)
  let shareText = '';
  if (isWin && attempts.length === 1) {
    shareText = 'Perfect Producer!\n\n';
  }
  
  shareText += `Poster Pixels #${puzzle.puzzle_number} ${pattern}\n`;
  shareText += `${attempts.length}/${POSTER_PIXELS_CONFIG.MAX_ATTEMPTS} rounds • ${totalSeconds}s • #cinamini\n\n`;
  shareText += `https://cinamini.app/game/poster-pixels`;

  return shareText;
}

/**
 * Calculate user statistics after a game
 */
export function calculateUserStats(
  currentStats: Partial<PosterPixelsUserStats>,
  gameResult: { 
    isWin: boolean; 
    score: number; 
    clarityLevel?: ClarityLevel;
    solveTimeMs?: number;
    totalGuesses: number;
  }
): Partial<PosterPixelsUserStats> {
  const stats = {
    games_played: (currentStats?.games_played || 0) + 1,
    games_won: (currentStats?.games_won || 0) + (gameResult.isWin ? 1 : 0),
    total_guesses: (currentStats?.total_guesses || 0) + gameResult.totalGuesses,
    perfect_games: (currentStats?.perfect_games || 0) + 
      (gameResult.isWin && gameResult.clarityLevel === 5 ? 1 : 0),
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
  
  // Calculate averages for winning games
  if (stats.games_won > 0) {
    const prevAvgClarity = currentStats?.average_clarity_level || 0;
    const prevAvgScore = currentStats?.average_score || 0;
    const prevWonGames = currentStats?.games_won || 0;
    
    if (gameResult.isWin && gameResult.clarityLevel) {
      stats.average_clarity_level = 
        ((prevAvgClarity * prevWonGames) + gameResult.clarityLevel) / stats.games_won;
      stats.average_score = 
        ((prevAvgScore * prevWonGames) + gameResult.score) / stats.games_won;
    } else {
      stats.average_clarity_level = prevAvgClarity;
      stats.average_score = prevAvgScore;
    }
    
    // Track best score
    stats.best_score = Math.max(
      gameResult.score,
      currentStats?.best_score || 0
    );
  }
  
  // Update solve times for winning games
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

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/**
 * Format clarity level for display
 */
export function formatClarityLevel(clarityLevel: ClarityLevel): string {
  return `${clarityLevel}%`;
}

/**
 * Get clarity level description
 */
export function getClarityDescription(clarityLevel: ClarityLevel): string {
  switch (clarityLevel) {
    case 5:
      return 'Extremely pixelated';
    case 15:
      return 'Very pixelated';
    case 35:
      return 'Moderately pixelated';
    case 65:
      return 'Slightly pixelated';
    case 100:
      return 'Full clarity';
    default:
      return 'Unknown clarity';
  }
}

/**
 * Check if a user has already played today's puzzle
 */
export function hasPlayedToday(lastPlayedDate: string | null): boolean {
  if (!lastPlayedDate) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return lastPlayedDate === today;
}

// ============================================================================
// EXPORT EVERYTHING
// ============================================================================

export type {
  PosterPixelsMovie,
  PosterPixelsPuzzle,
  PosterPixelsGuess,
  PosterPixelsGameState,
  PosterPixelsUserStats,
  PosterPixelsResult,
  ClarityLevel
};

export {
  SeededRandom
};

// Re-export seeding functions for convenience
export { generateDailySeed } from './game-seeding';