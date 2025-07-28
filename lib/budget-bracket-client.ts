// Budget Bracket client-safe utilities
// This file contains only client-safe functions and types

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