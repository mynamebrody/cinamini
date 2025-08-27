/**
 * Tests for puzzle numbering logic
 * 
 * These tests validate that puzzle numbers are calculated correctly based on
 * days since each game's launch date.
 */

import { calculatePuzzleNumberFromLaunch, type GameId } from '../puzzle-numbering';

// Mock Supabase client for testing
const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: (field: string, value: string) => ({
        single: async () => {
          // Mock launch dates for testing
          const launchDates: Record<GameId, string> = {
            'retitled': '2025-07-22',
            'budget-bracket': '2025-07-23',
            'cast-climb': '2025-07-28',
            'poster-pixels': '2025-07-28'
          };
          
          if (field === 'game_id') {
            return {
              data: { launch_date: launchDates[value as GameId] },
              error: null
            };
          }
          return { data: null, error: new Error('Not found') };
        }
      })
    })
  })
} as any;

describe('Puzzle Numbering', () => {
  describe('calculatePuzzleNumberFromLaunch', () => {
    it('should return 1 for launch date', async () => {
      const result = await calculatePuzzleNumberFromLaunch(mockSupabase, 'retitled', new Date('2025-07-22'));
      expect(result).toBe(1);
    });

    it('should increment for each day after launch', async () => {
      const result = await calculatePuzzleNumberFromLaunch(mockSupabase, 'retitled', new Date('2025-07-25'));
      expect(result).toBe(4); // 3 days after launch + 1
    });

    it('should handle different games with different launch dates', async () => {
      const retitledResult = await calculatePuzzleNumberFromLaunch(mockSupabase, 'retitled', new Date('2025-07-25'));
      const budgetResult = await calculatePuzzleNumberFromLaunch(mockSupabase, 'budget-bracket', new Date('2025-07-25'));
      
      expect(retitledResult).toBe(4); // 3 days since 2025-07-22
      expect(budgetResult).toBe(3); // 2 days since 2025-07-23
    });

    it('should handle month boundaries correctly', async () => {
      const result = await calculatePuzzleNumberFromLaunch(mockSupabase, 'cast-climb', new Date('2025-08-01'));
      expect(result).toBe(5); // 4 days since 2025-07-28
    });

    it('should throw error for invalid game ID', async () => {
      await expect(
        calculatePuzzleNumberFromLaunch(mockSupabase, 'invalid-game' as GameId, new Date())
      ).rejects.toThrow('Launch date not found for game: invalid-game');
    });
  });
});