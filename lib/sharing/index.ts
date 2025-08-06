/**
 * Centralized Sharing System
 * 
 * Main orchestrator for the unified sharing system across all games
 */

import type { 
  GameType, 
  GameShareData, 
  ShareResult, 
  ShareGenerator,
  RetitledShareData,
  BudgetBracketShareData,
  CastClimbShareData,
  PosterPixelsShareData
} from './types';

import { createRetitledShareGenerator } from './generators/retitled';
import { createBudgetBracketShareGenerator } from './generators/budget-bracket';
import { createCastClimbShareGenerator } from './generators/cast-climb';
import { createPosterPixelsShareGenerator } from './generators/poster-pixels';
import { ShareGenerationError } from './types';

/**
 * Share Generator Registry
 * Maps game types to their respective share generators
 */
class ShareGeneratorRegistry {
  private generators: Map<GameType, ShareGenerator>;
  private baseUrl: string;

  constructor(baseUrl: string = 'https://cinamini.app') {
    this.baseUrl = baseUrl;
    this.generators = new Map();
    this.generators.set('retitled', createRetitledShareGenerator(baseUrl));
    this.generators.set('budget-bracket', createBudgetBracketShareGenerator(baseUrl));
    this.generators.set('cast-climb', createCastClimbShareGenerator(baseUrl));
    this.generators.set('poster-pixels', createPosterPixelsShareGenerator(baseUrl));
  }

  getGenerator(game: GameType): ShareGenerator {
    const generator = this.generators.get(game);
    if (!generator) {
      throw new ShareGenerationError(`No generator found for game: ${game}`, game, 'unknown');
    }
    return generator;
  }

  async generateShareText(request: GameShareData): Promise<ShareResult> {
    try {
      const generator = this.getGenerator(request.game);
      return await generator.generateShareText(request.gameData);
    } catch (error) {
      throw new ShareGenerationError(
        `Failed to generate share text for ${request.game}`,
        request.game,
        request.puzzleId,
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Global registry instance
const shareRegistry = new ShareGeneratorRegistry();

/**
 * Main entry point for generating share text
 */
export async function generateGameShare(request: GameShareData): Promise<ShareResult> {
  return shareRegistry.generateShareText(request);
}

/**
 * Type-safe helper functions for each game
 */
export async function generateRetitledShare(
  puzzleId: string,
  gameData: RetitledShareData,
  userId?: string
): Promise<ShareResult> {
  return generateGameShare({
    game: 'retitled',
    puzzleId,
    gameData,
    userId,
  });
}

export async function generateBudgetBracketShare(
  puzzleId: string,
  gameData: BudgetBracketShareData,
  userId?: string
): Promise<ShareResult> {
  return generateGameShare({
    game: 'budget-bracket',
    puzzleId,
    gameData,
    userId,
  });
}

export async function generateCastClimbShare(
  puzzleId: string,
  gameData: CastClimbShareData,
  userId?: string
): Promise<ShareResult> {
  return generateGameShare({
    game: 'cast-climb',
    puzzleId,
    gameData,
    userId,
  });
}

export async function generatePosterPixelsShare(
  puzzleId: string,
  gameData: PosterPixelsShareData,
  userId?: string
): Promise<ShareResult> {
  return generateGameShare({
    game: 'poster-pixels',
    puzzleId,
    gameData,
    userId,
  });
}

// Re-export types for convenience
export type {
  GameType,
  GameShareData,
  ShareResult,
  RetitledShareData,
  BudgetBracketShareData,
  CastClimbShareData,
  PosterPixelsShareData,
} from './types';

export { ShareGenerationError } from './types';