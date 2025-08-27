/**
 * Tests for puzzle numbering logic
 * 
 * These tests validate that puzzle numbers increment correctly based on
 * the last puzzle date, regardless of when puzzles are created.
 */

import { calculateNextPuzzleNumber, type LastPuzzleInfo } from '../puzzle-numbering';

describe('Puzzle Numbering', () => {
  describe('calculateNextPuzzleNumber', () => {
    it('should start at 1 when no previous puzzle exists', () => {
      const currentDate = new Date('2025-08-27');
      const result = calculateNextPuzzleNumber(currentDate, null);
      expect(result).toBe(1);
    });

    it('should increment by 1 for the next day', () => {
      const currentDate = new Date('2025-08-28');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-08-27',
        puzzle_number: 100
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(101);
    });

    it('should increment by days difference for multiple days gap', () => {
      const currentDate = new Date('2025-08-30');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-08-27',
        puzzle_number: 100
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(103); // 100 + 3 days
    });

    it('should use same number for same day', () => {
      const currentDate = new Date('2025-08-27');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-08-27',
        puzzle_number: 100
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(100); // Same day, same number
    });

    it('should handle puzzles created out of order', () => {
      // Creating a puzzle for an earlier date when later dates exist
      const currentDate = new Date('2025-08-25');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-08-27',
        puzzle_number: 100
      };
      // This would give 98 (100 - 2), but in practice we'd query for the puzzle before this date
      // This test shows the raw calculation
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(98); // 100 - 2 days
    });

    it('should handle month boundaries correctly', () => {
      const currentDate = new Date('2025-09-01');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-08-31',
        puzzle_number: 150
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(151); // Next day across month boundary
    });

    it('should handle year boundaries correctly', () => {
      const currentDate = new Date('2026-01-01');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-12-31',
        puzzle_number: 365
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(366); // Next day across year boundary
    });

    it('should handle leap years correctly', () => {
      const currentDate = new Date('2024-03-01'); // Day after Feb 29 in leap year
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2024-02-28',
        puzzle_number: 59
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(61); // 59 + 2 days (Feb 29 + Mar 1)
    });

    it('should handle timezone differences by using date strings', () => {
      // Using UTC midnight dates to avoid timezone issues
      const currentDate = new Date('2025-08-27T00:00:00Z');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-08-26', // Date string without time
        puzzle_number: 99
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(100);
    });

    it('should handle large gaps correctly', () => {
      const currentDate = new Date('2025-12-31');
      const lastPuzzle: LastPuzzleInfo = {
        puzzle_date: '2025-01-01',
        puzzle_number: 1
      };
      const result = calculateNextPuzzleNumber(currentDate, lastPuzzle);
      expect(result).toBe(365); // 364 days difference + 1
    });
  });
});