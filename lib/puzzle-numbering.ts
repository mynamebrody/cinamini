/**
 * Utility functions for sequential puzzle numbering across all games
 * 
 * Calculates puzzle numbers based on days since each game's launch date.
 * This eliminates the need to store puzzle numbers in the database.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type GameId = 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels';

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
 * Get the launch date for a specific game from the database
 */
export async function getGameLaunchDate(supabase: SupabaseClient, gameId: GameId): Promise<Date> {
  const { data, error } = await supabase
    .from('cinamini_games')
    .select('launch_date')
    .eq('game_id', gameId)
    .single();

  if (error || !data?.launch_date) {
    throw new Error(`Launch date not found for game: ${gameId}`);
  }

  return new Date(data.launch_date);
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