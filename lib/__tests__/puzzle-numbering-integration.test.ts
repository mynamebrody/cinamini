/**
 * Integration test examples for puzzle numbering across all games
 * 
 * These examples demonstrate how the puzzle numbering system ensures
 * sequential numbering based on launch dates for each game.
 */

import { calculatePuzzleNumberFromLaunch } from '../puzzle-numbering';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client for testing
const createMockSupabase = (gameData: Record<string, string>): SupabaseClient => {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => ({
          single: () => {
            if (table === 'cinamini_games' && column === 'game_id') {
              const launchDate = gameData[value];
              if (launchDate) {
                return Promise.resolve({ data: { launch_date: launchDate }, error: null });
              } else {
                return Promise.resolve({ data: null, error: { message: 'Game not found' } });
              }
            }
            return Promise.resolve({ data: null, error: { message: 'Unexpected query' } });
          }
        })
      })
    })
  } as unknown as SupabaseClient;
};

describe('Puzzle Numbering Integration', () => {
  const gameData = {
    'retitled': '2025-08-01',
    'budget-bracket': '2025-08-05', 
    'cast-climb': '2025-08-10',
    'poster-pixels': '2025-08-15'
  };

  describe('Retitled Game', () => {
    it('should calculate correct puzzle number for launch day', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'retitled', 
        new Date('2025-08-01')
      );
      expect(puzzleNumber).toBe(1);
    });

    it('should calculate puzzle number for day after launch', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'retitled', 
        new Date('2025-08-02')
      );
      expect(puzzleNumber).toBe(2);
    });

    it('should calculate puzzle number for multiple days after launch', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'retitled', 
        new Date('2025-08-10') // 9 days after launch
      );
      expect(puzzleNumber).toBe(10);
    });
  });

  describe('Budget Bracket Game', () => {
    it('should calculate independently from other games', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'budget-bracket', 
        new Date('2025-08-07') // 2 days after its launch (Aug 5)
      );
      expect(puzzleNumber).toBe(3);
    });
  });

  describe('Cast Climb Game', () => {
    it('should calculate based on its own launch date', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'cast-climb', 
        new Date('2025-08-15') // 5 days after its launch (Aug 10)
      );
      expect(puzzleNumber).toBe(6);
    });
  });

  describe('Poster Pixels Game', () => {
    it('should calculate from its launch date', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'poster-pixels', 
        new Date('2025-08-20') // 5 days after its launch (Aug 15)
      );
      expect(puzzleNumber).toBe(6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle same-day puzzle creation (launch day)', async () => {
      const supabase = createMockSupabase(gameData);
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'retitled', 
        new Date('2025-08-01') // Launch day
      );
      expect(puzzleNumber).toBe(1);
    });

    it('should handle date before launch gracefully', async () => {
      const supabase = createMockSupabase(gameData);
      // This should still work but give puzzle number 0 or 1 depending on implementation
      const puzzleNumber = await calculatePuzzleNumberFromLaunch(
        supabase, 
        'retitled', 
        new Date('2025-07-31') // Day before launch
      );
      expect(puzzleNumber).toBe(0); // 0 days since launch, but +1 makes it 1
    });

    it('should handle database errors gracefully', async () => {
      const supabase = createMockSupabase({}); // No game data
      try {
        await calculatePuzzleNumberFromLaunch(
          supabase, 
          'retitled', 
          new Date('2025-08-27')
        );
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Launch date not found');
      }
    });
  });

  describe('Multi-game Consistency', () => {
    it('should maintain independent sequences for each game', async () => {
      const supabase = createMockSupabase(gameData);
      const targetDate = new Date('2025-08-20');
      
      const retitledNumber = await calculatePuzzleNumberFromLaunch(supabase, 'retitled', targetDate);
      const budgetNumber = await calculatePuzzleNumberFromLaunch(supabase, 'budget-bracket', targetDate);
      const castNumber = await calculatePuzzleNumberFromLaunch(supabase, 'cast-climb', targetDate);
      const posterNumber = await calculatePuzzleNumberFromLaunch(supabase, 'poster-pixels', targetDate);

      // Calculate expected numbers based on launch dates
      expect(retitledNumber).toBe(20); // Aug 20 - Aug 1 = 19 days + 1 = 20
      expect(budgetNumber).toBe(16); // Aug 20 - Aug 5 = 15 days + 1 = 16
      expect(castNumber).toBe(11); // Aug 20 - Aug 10 = 10 days + 1 = 11
      expect(posterNumber).toBe(6); // Aug 20 - Aug 15 = 5 days + 1 = 6
    });
  });
});