// Budget Bracket game logic and utilities - CLIENT SAFE
import { 
  generateDailySeed, 
  SeededRandom, 
  type SeedableGameItem 
} from './game-seeding';

export interface BudgetBracketMovie extends SeedableGameItem {
  id: number;
  tmdb_id: number;
  title: string;
  production_budget: number;
  budget_source: string;
  is_budget_estimated: boolean;
  poster_path: string | null;
  release_date: string;
  popularity_score: number;
}

// Removed: EnhancedBudgetBracketMovie interface (over-engineered)

export interface MoviePair {
  movieA: BudgetBracketMovie;
  movieB: BudgetBracketMovie;
  round: number;
  correctChoice: 'A' | 'B'; // Which movie has the higher budget
  budgetDifference: number; // Absolute difference in budgets
  difficultyRatio: number; // Higher budget / lower budget
}

export interface BudgetBracketPuzzle {
  id: number;
  puzzle_date: string;
  seed_value: string;
  movie_pairs: MoviePair[];
  difficulty_progression: number[]; // Target difficulty ratios for each round
}

export interface GameChoice {
  round: number;
  chosen_movie: number; // tmdb_id of chosen movie
  correct: boolean;
  time_taken_ms: number;
}

export interface GameResult {
  rounds_completed: number;
  final_result: string; // 'perfect' | 'failed_round_1' | 'failed_round_2' | etc.
  choices: GameChoice[];
  total_duration_ms: number;
}

export interface BudgetBracketStats {
  user_id: string;
  games_played: number;
  perfect_games: number;
  current_streak: number;
  best_streak: number;
  total_rounds_won: number;
  average_round_reached: number;
  last_played_date: string | null;
}

// Difficulty progression: Round 1 ≥ 2× diff, Round 5 ≤ 15% diff
export const DIFFICULTY_TARGETS = [
  2.0,   // Round 1: 2x difference minimum (easy)
  1.8,   // Round 2: 1.8x difference
  1.5,   // Round 3: 1.5x difference
  1.3,   // Round 4: 1.3x difference
  1.15   // Round 5: 1.15x difference maximum (hard)
];

/**
 * Generate a Budget Bracket specific daily seed
 */
export function generateBudgetBracketSeed(date: Date): string {
  return generateDailySeed(date, { 
    gameId: 'budget-bracket',
    gameEntropy: 'movie-pairs' 
  });
}

// Removed: getBudgetBracketMovies (server-side operation moved to API routes)

/**
 * Validate that a movie meets Budget Bracket requirements
 */
export function validateBudgetBracketMovie(
  movie: any
): movie is BudgetBracketMovie {
  return (
    typeof movie.tmdb_id === 'number' &&
    typeof movie.title === 'string' &&
    typeof movie.production_budget === 'number' &&
    movie.production_budget >= 5_000_000 &&
    typeof movie.popularity_score === 'number' &&
    movie.popularity_score >= 30
  );
}

/**
 * Calculate difficulty ratio between two budgets
 */
export function calculateDifficultyRatio(budget1: number, budget2: number): number {
  const higher = Math.max(budget1, budget2);
  const lower = Math.min(budget1, budget2);
  return higher / lower;
}

/**
 * Check if two movies form a valid pair for a given difficulty target
 */
export function isValidPair(
  movieA: BudgetBracketMovie, 
  movieB: BudgetBracketMovie, 
  targetDifficulty: number,
  tolerance: number = 0.3
): boolean {
  const ratio = calculateDifficultyRatio(movieA.production_budget, movieB.production_budget);
  
  // For early rounds (easy), we want ratio >= target
  // For later rounds (hard), we want ratio <= target
  if (targetDifficulty >= 1.5) {
    // Easy rounds: allow higher ratios
    return ratio >= (targetDifficulty - tolerance);
  } else {
    // Hard rounds: enforce maximum ratio
    return ratio <= (targetDifficulty + tolerance);
  }
}

// Removed: Complex server-side puzzle generation functions
// These have been moved to API routes to properly separate client/server concerns

/**
 * Generate puzzle pairs from provided movies (client-safe)
 */
export function generatePuzzlePairs(
  movies: BudgetBracketMovie[], 
  seed: string
): MoviePair[] {
  const rng = new SeededRandom(seed);
  const pairs: MoviePair[] = [];
  const usedMovies = new Set<number>();

  for (let round = 0; round < 5; round++) {
    const targetDifficulty = DIFFICULTY_TARGETS[round];
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      // Get two random unused movies
      const availableMovies = movies.filter(m => !usedMovies.has(m.tmdb_id));
      if (availableMovies.length < 2) break;

      const movieA = availableMovies[rng.nextInt(0, availableMovies.length - 1)];
      let movieB = availableMovies[rng.nextInt(0, availableMovies.length - 1)];
      
      // Ensure different movies
      while (movieB.tmdb_id === movieA.tmdb_id) {
        movieB = availableMovies[rng.nextInt(0, availableMovies.length - 1)];
      }

      if (isValidPair(movieA, movieB, targetDifficulty)) {
        const correctChoice = movieA.production_budget > movieB.production_budget ? 'A' : 'B';
        const budgetDifference = Math.abs(movieA.production_budget - movieB.production_budget);
        const difficultyRatio = calculateDifficultyRatio(movieA.production_budget, movieB.production_budget);

        pairs.push({
          movieA,
          movieB,
          round: round + 1,
          correctChoice,
          budgetDifference,
          difficultyRatio
        });

        usedMovies.add(movieA.tmdb_id);
        usedMovies.add(movieB.tmdb_id);
        break;
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(`Could not generate valid pair for round ${round + 1}`);
    }
  }

  return pairs;
}

/**
 * Format budget for display
 */
export function formatBudget(budget: number, includeEstimate: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(budget);

  if (includeEstimate) {
    return `${formatted} est.`;
  }

  return formatted;
}

/**
 * Get poster URL for TMDB image
 */
export function getPosterUrl(posterPath: string | null, size: string = 'w342'): string {
  if (!posterPath) {
    return '/placeholder-poster.svg'; // Fallback poster
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

/**
 * Generate share result emoji pattern
 */
export function generateSharePattern(choices: GameChoice[]): string {
  const maxRounds = 5;
  const pattern: string[] = [];

  for (let i = 0; i < maxRounds; i++) {
    if (i < choices.length) {
      pattern.push(choices[i].correct ? '🟩' : '🟥');
      // If this was incorrect, break (user failed)
      if (!choices[i].correct) {
        break;
      }
    } else {
      // This round wasn't reached
      break;
    }
  }

  // Pad with empty squares if needed (for visual consistency)
  while (pattern.length < maxRounds) {
    pattern.push('⬜');
  }

  return pattern.join('');
}

/**
 * Calculate final result string based on performance
 */
export function calculateFinalResult(choices: GameChoice[]): string {
  if (choices.length === 5 && choices.every(c => c.correct)) {
    return 'perfect';
  }

  const lastRound = choices.length;
  return `failed_round_${lastRound}`;
}

/**
 * Check if a user has already played today's puzzle
 */
export function hasPlayedToday(lastPlayedDate: string | null): boolean {
  if (!lastPlayedDate) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return lastPlayedDate === today;
}

// Re-export seeding functions for backward compatibility and convenience
export { generateDailySeed, SeededRandom } from './game-seeding';