// Budget Bracket game logic and utilities

export interface BudgetBracketMovie {
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
 * Generate a deterministic seed from a date
 */
export function generateDailySeed(date: Date): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  // Simple hash function for deterministic seed
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Seeded random number generator for consistent daily puzzles
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
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

/**
 * Generate movie pairs for a daily puzzle
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
    return '/placeholder-poster.jpg'; // Fallback poster
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