/**
 * Utility functions for sequential puzzle numbering across all games
 * 
 * Calculates puzzle numbers based on days since each game's launch date.
 * This eliminates the need to store puzzle numbers in the database.
 * 
 * Includes caching system to reduce database queries for launch dates.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type GameId = 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels';

// Cache for launch dates to avoid repeated database queries
interface CacheEntry {
  launchDate: Date;
  timestamp: number;
}

class LaunchDateCache {
  private cache = new Map<GameId, CacheEntry>();
  private readonly TTL = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
  
  get(gameId: GameId): Date | null {
    const entry = this.cache.get(gameId);
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(gameId);
      return null;
    }
    
    return entry.launchDate;
  }
  
  set(gameId: GameId, launchDate: Date): void {
    this.cache.set(gameId, {
      launchDate: new Date(launchDate), // Clone to avoid mutation
      timestamp: Date.now()
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Pre-warm cache with all game launch dates
  async warmUp(supabase: SupabaseClient): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('cinamini_games')
        .select('game_id, launch_date')
        .in('game_id', ['retitled', 'budget-bracket', 'cast-climb', 'poster-pixels'] as GameId[]);
      
      if (error) {
        console.warn('Failed to warm up launch date cache:', error);
        return;
      }
      
      data?.forEach(game => {
        if (game.launch_date) {
          this.set(game.game_id as GameId, new Date(game.launch_date));
        }
      });
      
      console.log(`Warmed up launch date cache for ${data?.length || 0} games`);
    } catch (error) {
      console.warn('Error warming up launch date cache:', error);
    }
  }
}

// Global cache instance
const launchDateCache = new LaunchDateCache();

/**
 * Calculate days between two dates (inclusive of start date)
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset time to midnight to ensure date-only comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the launch date for a specific game from cache or database
 */
export async function getGameLaunchDate(supabase: SupabaseClient, gameId: GameId): Promise<Date> {
  // Try to get from cache first
  const cachedDate = launchDateCache.get(gameId);
  if (cachedDate) {
    return cachedDate;
  }

  // Cache miss - fetch from database
  try {
    const { data, error } = await supabase
      .from('cinamini_games')
      .select('launch_date')
      .eq('game_id', gameId)
      .single();

    if (error || !data?.launch_date) {
      throw new Error(`Launch date not found for game: ${gameId}`);
    }

    const launchDate = new Date(data.launch_date);
    
    // Store in cache for next time
    launchDateCache.set(gameId, launchDate);
    
    return launchDate;
  } catch (error) {
    // If database query fails, try to warm up cache as fallback
    await launchDateCache.warmUp(supabase);
    const fallbackDate = launchDateCache.get(gameId);
    
    if (fallbackDate) {
      return fallbackDate;
    }
    
    throw new Error(`Launch date not found for game: ${gameId}. Database error: ${error}`);
  }
}

/**
 * Calculate the puzzle number for a game based on days since launch
 * 
 * @param supabase - Supabase client to fetch launch date
 * @param gameId - The game identifier (e.g., 'retitled', 'budget-bracket')
 * @param targetDate - The date for which to calculate the puzzle number
 * @returns The puzzle number (1 for launch date, 2 for next day, etc.)
 */
export async function calculatePuzzleNumberFromLaunch(
  supabase: SupabaseClient, 
  gameId: GameId, 
  targetDate: Date
): Promise<number> {
  const launchDate = await getGameLaunchDate(supabase, gameId);
  const daysSinceLaunch = daysBetween(launchDate, targetDate);
  
  // Puzzle #1 is on launch date, #2 the next day, etc.
  return daysSinceLaunch + 1;
}

/**
 * Check if a game has launched by a given date
 */
export async function hasGameLaunched(
  supabase: SupabaseClient, 
  gameId: GameId, 
  targetDate: Date
): Promise<boolean> {
  const launchDate = await getGameLaunchDate(supabase, gameId);
  return targetDate >= launchDate;
}

/**
 * Warm up the launch date cache with all game launch dates
 * This can be called proactively to improve performance
 */
export async function warmUpLaunchDateCache(supabase: SupabaseClient): Promise<void> {
  await launchDateCache.warmUp(supabase);
}

/**
 * Clear the launch date cache (useful for testing or forcing refresh)
 */
export function clearLaunchDateCache(): void {
  launchDateCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getLaunchDateCacheStats(): {
  size: number;
  games: GameId[];
} {
  const cacheMap = (launchDateCache as any).cache as Map<GameId, CacheEntry>;
  return {
    size: cacheMap.size,
    games: Array.from(cacheMap.keys())
  };
}