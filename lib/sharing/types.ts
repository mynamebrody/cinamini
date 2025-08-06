/**
 * Centralized Sharing System Types
 * 
 * This module defines the types and interfaces for the unified sharing system
 * across all games in the cinamini platform.
 */

export type GameType = 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels';

export interface BaseGameShareRequest {
  game: GameType;
  puzzleId: string;
  userId?: string; // Optional for anonymous users
}

export interface ShareResult {
  shareText: string;
  shareUrl: string;
  metadata?: {
    puzzleNumber: number;
    gameSpecific?: Record<string, any>;
  };
}

// Game-specific share request data
export interface RetitledShareData {
  guess: {
    isCorrect: boolean;
    solveTimeMs: number;
  };
  puzzle: {
    puzzleNumber: number;
    countryCode: string;
    localizedTitle: string;
  };
}

export interface BudgetBracketShareData {
  rounds: Array<{
    round: number;
    correct: boolean;
    timeMs: number;
  }>;
  puzzle: {
    puzzleNumber: number;
  };
  result: {
    isPerfectGame: boolean;
    totalDurationMs: number;
    roundsCompleted: number;
  };
}

export interface CastClimbShareData {
  guesses: Array<{
    isCorrect: boolean;
    actorsRevealed: number;
    attemptNumber: number;
  }>;
  puzzle: {
    puzzleNumber: number;
  };
  result: {
    isWin: boolean;
    totalGuesses: number;
  };
}

export interface PosterPixelsShareData {
  attempts: Array<{
    isCorrect: boolean;
    clarityLevel: number;
    solveTimeMs: number;
  }>;
  puzzle: {
    puzzleNumber: number;
  };
  result: {
    isWin: boolean;
    finalScore: number;
    timedOut: boolean;
  };
}

export type GameShareData = 
  | (BaseGameShareRequest & { game: 'retitled'; gameData: RetitledShareData })
  | (BaseGameShareRequest & { game: 'budget-bracket'; gameData: BudgetBracketShareData })
  | (BaseGameShareRequest & { game: 'cast-climb'; gameData: CastClimbShareData })
  | (BaseGameShareRequest & { game: 'poster-pixels'; gameData: PosterPixelsShareData });

export interface ShareGenerator {
  generateShareText(data: any): Promise<ShareResult>;
}

export interface ShareGeneratorConfig {
  baseUrl: string;
  gameSlug: string;
}

// Error types
export class ShareGenerationError extends Error {
  constructor(
    message: string,
    public game: GameType,
    public puzzleId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ShareGenerationError';
  }
}