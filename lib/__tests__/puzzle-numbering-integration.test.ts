/**
 * Integration test examples for puzzle numbering across all games
 * 
 * These examples demonstrate how the puzzle numbering system ensures
 * sequential numbering based on the last puzzle date for each game.
 */

import { calculatePuzzleNumberForGame } from '../puzzle-numbering';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client for testing
const createMockSupabase = (data: any[], error: any = null): SupabaseClient => {
  return {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: data[0] || null, error })
          })
        })
      })
    })
  } as unknown as SupabaseClient;
};

describe('Puzzle Numbering Integration', () => {
  describe('Retitled Game', () => {
    it('should calculate correct puzzle number for first puzzle', async () => {
      const supabase = createMockSupabase([]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'retitled', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(1);
    });

    it('should increment from last puzzle', async () => {
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-26', puzzle_number: 42 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'retitled', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(43);
    });

    it('should handle gap in dates', async () => {
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-20', puzzle_number: 35 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'retitled', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(42); // 35 + 7 days
    });
  });

  describe('Budget Bracket Game', () => {
    it('should calculate independently from other games', async () => {
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-25', puzzle_number: 10 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'budget_bracket', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(12); // 10 + 2 days
    });
  });

  describe('Cast Climb Game', () => {
    it('should handle existing sequential numbering', async () => {
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-26', puzzle_number: 30 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'cast_climb', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(31);
    });
  });

  describe('Poster Pixels Game', () => {
    it('should transition from auto-increment to sequential', async () => {
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-24', puzzle_number: 27 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'poster_pixels', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(30); // 27 + 3 days
    });
  });

  describe('Edge Cases', () => {
    it('should handle same-day puzzle creation', async () => {
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-27', puzzle_number: 50 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'retitled', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(50); // Same day, same number
    });

    it('should handle database errors gracefully', async () => {
      const supabase = createMockSupabase([], { code: 'PGRST116', message: 'No rows' });
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'retitled', 
        new Date('2025-08-27')
      );
      expect(puzzleNumber).toBe(1); // Falls back to 1 when no puzzles exist
    });

    it('should handle out-of-order puzzle creation scenario', async () => {
      // Scenario: We have puzzles for days 1-5 and 10-12, creating puzzle for day 7
      // In practice, we'd need to query for the last puzzle before day 7
      // This test shows the expected behavior
      const supabase = createMockSupabase([
        { puzzle_date: '2025-08-05', puzzle_number: 5 }
      ]);
      const puzzleNumber = await calculatePuzzleNumberForGame(
        supabase, 
        'retitled', 
        new Date('2025-08-07')
      );
      expect(puzzleNumber).toBe(7); // 5 + 2 days
    });
  });

  describe('Multi-game Consistency', () => {
    it('should maintain independent sequences for each game', async () => {
      const retitledSupabase = createMockSupabase([
        { puzzle_date: '2025-08-26', puzzle_number: 100 }
      ]);
      const budgetSupabase = createMockSupabase([
        { puzzle_date: '2025-08-26', puzzle_number: 50 }
      ]);
      const castSupabase = createMockSupabase([
        { puzzle_date: '2025-08-26', puzzle_number: 30 }
      ]);
      const posterSupabase = createMockSupabase([
        { puzzle_date: '2025-08-26', puzzle_number: 27 }
      ]);

      const targetDate = new Date('2025-08-27');
      
      const retitledNumber = await calculatePuzzleNumberForGame(retitledSupabase, 'retitled', targetDate);
      const budgetNumber = await calculatePuzzleNumberForGame(budgetSupabase, 'budget_bracket', targetDate);
      const castNumber = await calculatePuzzleNumberForGame(castSupabase, 'cast_climb', targetDate);
      const posterNumber = await calculatePuzzleNumberForGame(posterSupabase, 'poster_pixels', targetDate);

      expect(retitledNumber).toBe(101);
      expect(budgetNumber).toBe(51);
      expect(castNumber).toBe(31);
      expect(posterNumber).toBe(28);
    });
  });
});