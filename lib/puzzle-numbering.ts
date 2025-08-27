/**
 * Utility functions for sequential puzzle numbering across all games
 * 
 * This module ensures puzzle numbers increment by one day after the last puzzle date,
 * regardless of when puzzles are created. This maintains consistent sequencing even
 * when puzzles are created out of order or on the same day.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface LastPuzzleInfo {
  puzzle_date: string;
  puzzle_number: number;
}

/**
 * Calculate the next puzzle number for a game based on the last puzzle date
 * 
 * @param currentDate - The date for which to calculate the puzzle number
 * @param lastPuzzle - Information about the most recent puzzle (if any)
 * @returns The calculated puzzle number
 */
export function calculateNextPuzzleNumber(
  currentDate: Date,
  lastPuzzle: LastPuzzleInfo | null
): number {
  // If no previous puzzle exists, start at 1
  if (!lastPuzzle) {
    return 1;
  }

  // Calculate days between last puzzle date and current date
  const lastPuzzleDate = new Date(lastPuzzle.puzzle_date);
  const daysDiff = Math.floor(
    (currentDate.getTime() - lastPuzzleDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // New puzzle number is last puzzle number + days difference
  // If it's the same day, use the same puzzle number (shouldn't happen in normal flow)
  return lastPuzzle.puzzle_number + Math.max(0, daysDiff);
}

/**
 * Get the last puzzle information for a specific game
 * 
 * @param supabase - Supabase client (service role recommended for system operations)
 * @param tableName - Name of the puzzle table (e.g., 'retitled_puzzles')
 * @returns The last puzzle info or null if no puzzles exist
 */
export async function getLastPuzzle(
  supabase: SupabaseClient,
  tableName: string
): Promise<LastPuzzleInfo | null> {
  const { data, error } = await supabase
    .from(tableName)
    .select('puzzle_date, puzzle_number')
    .order('puzzle_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // No existing puzzles is not an error - it just means we start from 1
    if (error?.code === 'PGRST116') {
      return null;
    }
    console.log(`No existing puzzles found in ${tableName}`);
    return null;
  }

  return data as LastPuzzleInfo;
}

/**
 * Calculate the puzzle number for a specific game and date
 * This is the main function to use when generating new puzzles
 * 
 * @param supabase - Supabase client (service role recommended)
 * @param gameName - Name of the game (e.g., 'retitled', 'budget_bracket', 'cast_climb', 'poster_pixels')
 * @param targetDate - The date for which to calculate the puzzle number
 * @returns The calculated puzzle number
 */
export async function calculatePuzzleNumberForGame(
  supabase: SupabaseClient,
  gameName: string,
  targetDate: Date
): Promise<number> {
  const tableName = `${gameName}_puzzles`;
  
  // Get the most recent puzzle
  const lastPuzzle = await getLastPuzzle(supabase, tableName);
  
  // Calculate the puzzle number based on the last puzzle
  return calculateNextPuzzleNumber(targetDate, lastPuzzle);
}

/**
 * Validate that a puzzle number is correct for a given date
 * Useful for ensuring data integrity
 * 
 * @param supabase - Supabase client
 * @param gameName - Name of the game
 * @param targetDate - The date to validate
 * @param puzzleNumber - The puzzle number to validate
 * @returns True if the puzzle number is correct for the date
 */
export async function validatePuzzleNumber(
  supabase: SupabaseClient,
  gameName: string,
  targetDate: Date,
  puzzleNumber: number
): Promise<boolean> {
  const expectedNumber = await calculatePuzzleNumberForGame(supabase, gameName, targetDate);
  return expectedNumber === puzzleNumber;
}