/**
 * Unified Game Seeding System for cinamini
 * 
 * This module provides deterministic seeding functionality for all cinamini games,
 * ensuring that all players receive the same daily puzzle based on the date.
 * Originally extracted from Budget Bracket game logic.
 */

/**
 * Configuration interface for game-specific seeding options
 */
export interface GameSeedConfig {
  /** Game identifier (e.g., 'budget-bracket', 'retitled') */
  gameId: string;
  /** Optional additional entropy for game-specific randomization */
  gameEntropy?: string;
}

/**
 * Base interface for any game item that can be seeded/shuffled
 */
export interface SeedableGameItem {
  /** Unique identifier for the item */
  id: number;
  /** Any additional properties specific to the game */
  [key: string]: any;
}

/**
 * Generate a deterministic seed from a date and optional game configuration
 * 
 * @param date - The date to generate seed for (typically today's date)
 * @param config - Optional game-specific configuration
 * @returns A deterministic seed string based on the date and game config
 * 
 * @example
 * ```typescript
 * // Basic usage for any game
 * const seed = generateDailySeed(new Date());
 * 
 * // Game-specific usage with additional entropy
 * const budgetSeed = generateDailySeed(new Date(), { 
 *   gameId: 'budget-bracket',
 *   gameEntropy: 'movie-pairs' 
 * });
 * ```
 */
export function generateDailySeed(date: Date, config?: GameSeedConfig): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Combine date with game-specific data if provided
  let seedSource = dateStr;
  if (config) {
    seedSource += `_${config.gameId}`;
    if (config.gameEntropy) {
      seedSource += `_${config.gameEntropy}`;
    }
  }
  
  // Simple hash function for deterministic seed
  let hash = 0;
  for (let i = 0; i < seedSource.length; i++) {
    const char = seedSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Seeded random number generator for consistent daily puzzles across all games
 * 
 * Uses a linear congruential generator (LCG) algorithm for deterministic
 * pseudo-random number generation. All players with the same seed will
 * get identical sequences of random numbers.
 * 
 * @example
 * ```typescript
 * const rng = new SeededRandom('abc123');
 * const randomFloat = rng.next(); // 0.0 - 1.0
 * const randomInt = rng.nextInt(1, 6); // 1-6 inclusive
 * const shuffledArray = rng.shuffle([1, 2, 3, 4, 5]);
 * ```
 */
export class SeededRandom {
  private seed: number;

  /**
   * Create a new seeded random number generator
   * @param seed - String seed that will be hashed to create initial state
   */
  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  /**
   * Hash a string into a numeric seed value
   * @param str - String to hash
   * @returns Positive integer hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate next random float between 0.0 and 1.0
   * @returns Random float in range [0, 1)
   */
  next(): number {
    // Linear congruential generator (LCG) with good constants
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate random integer in specified range (inclusive)
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Randomly shuffle an array using Fisher-Yates algorithm
   * @param array - Array to shuffle (original array is not modified)
   * @returns New shuffled array
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Select a random element from an array
   * @param array - Array to select from
   * @returns Random element from the array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Select multiple random elements from an array without replacement
   * @param array - Array to select from
   * @param count - Number of elements to select
   * @returns Array of randomly selected elements
   */
  sample<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error('Cannot sample more elements than available in array');
    }
    if (count <= 0) {
      return [];
    }
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }

  /**
   * Generate a random boolean with optional probability
   * @param probability - Probability of returning true (0.0 to 1.0), defaults to 0.5
   * @returns Random boolean
   */
  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

/**
 * Utility type for functions that validate game-specific item pairs or groups
 */
export type GameItemValidator<T extends SeedableGameItem> = (items: T[]) => boolean;

/**
 * Utility type for functions that generate game-specific content from selected items
 */
export type GameContentGenerator<T extends SeedableGameItem, R> = (
  items: T[],
  rng: SeededRandom,
  round?: number
) => R;

/**
 * Generic seeded selection utility for games that need to pick items with validation
 * 
 * @param items - Array of items to select from
 * @param seed - Seed string for deterministic selection
 * @param count - Number of items to select
 * @param validator - Optional validation function for selected items
 * @param maxAttempts - Maximum attempts to find valid selection
 * @returns Array of selected items that pass validation
 * 
 * @example
 * ```typescript
 * // Select 2 movies for a comparison game
 * const moviePair = selectGameItems(
 *   movies,
 *   todaysSeed,
 *   2,
 *   (selected) => Math.abs(selected[0].budget - selected[1].budget) > 1000000
 * );
 * ```
 */
export function selectGameItems<T extends SeedableGameItem>(
  items: T[],
  seed: string,
  count: number,
  validator?: GameItemValidator<T>,
  maxAttempts: number = 1000
): T[] {
  const rng = new SeededRandom(seed);
  
  if (count > items.length) {
    throw new Error(`Cannot select ${count} items from array of length ${items.length}`);
  }

  if (!validator) {
    // Simple case: just return random sample
    return rng.sample(items, count);
  }

  // Complex case: try to find valid selection
  let attempts = 0;
  while (attempts < maxAttempts) {
    const selected = rng.sample(items, count);
    
    if (validator(selected)) {
      return selected;
    }
    
    attempts++;
  }

  throw new Error(`Could not find valid selection after ${maxAttempts} attempts`);
}

/**
 * Generate multiple rounds of game content with progressive difficulty or requirements
 * 
 * @param items - Array of items to select from
 * @param seed - Seed string for deterministic generation
 * @param rounds - Number of rounds to generate
 * @param generator - Function to generate content for each round
 * @param itemsPerRound - Number of items needed per round
 * @param allowReuse - Whether items can be reused across rounds
 * @returns Array of generated content for each round
 * 
 * @example
 * ```typescript
 * // Generate 5 rounds of movie pairs for Budget Bracket
 * const rounds = generateGameRounds(
 *   movies,
 *   seed,
 *   5,
 *   (selectedMovies, rng, round) => ({
 *     movieA: selectedMovies[0],
 *     movieB: selectedMovies[1],
 *     round: round + 1
 *   }),
 *   2,
 *   false // Don't reuse movies
 * );
 * ```
 */
export function generateGameRounds<T extends SeedableGameItem, R>(
  items: T[],
  seed: string,
  rounds: number,
  generator: GameContentGenerator<T, R>,
  itemsPerRound: number,
  allowReuse: boolean = false
): R[] {
  const rng = new SeededRandom(seed);
  const results: R[] = [];
  const usedItems = new Set<number>();

  for (let round = 0; round < rounds; round++) {
    let availableItems = items;
    
    if (!allowReuse) {
      availableItems = items.filter(item => !usedItems.has(item.id));
      
      if (availableItems.length < itemsPerRound) {
        throw new Error(`Not enough unused items for round ${round + 1}`);
      }
    }

    const selectedItems = rng.sample(availableItems, itemsPerRound);
    const roundContent = generator(selectedItems, rng, round);
    
    results.push(roundContent);

    if (!allowReuse) {
      selectedItems.forEach(item => usedItems.add(item.id));
    }
  }

  return results;
}

/**
 * Utility function to check if two dates represent the same day (ignoring time)
 * Useful for checking if a user has already played today's puzzle
 * 
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 * Consistent format for all games to use as puzzle date identifiers
 * 
 * @returns Today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a date string back into a Date object
 * Counterpart to getTodayDateString() for consistent date handling
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object set to midnight UTC of the specified date
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}