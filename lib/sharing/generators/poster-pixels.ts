/**
 * Poster Pixels Game Share Generator
 * 
 * Generates share text for the Poster Pixels game (progressive poster clarity guessing)
 */

import type { PosterPixelsShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';
import { POSTER_PIXELS_LEVELS } from '@/lib/poster-pixels-config'

export class PosterPixelsShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  private calculateAttemptsBeforeWin(attempts: any[]): number {
    // Count all attempts before the final successful one
    if (attempts.length === 0) return 0
    const lastAttempt = attempts[attempts.length - 1]
    if (lastAttempt.isCorrect) {
      // For wins, count all attempts except the final correct one
      return Math.max(0, attempts.length - 1)
    } else {
      // For losses, use 4 (standard format 🔍🔍🔍🔍❌)
      return 4
    }
  }

  private generateResultEmojis(attempts: any[], isWin: boolean): string {
    const attemptsUsed = this.calculateAttemptsBeforeWin(attempts)
    const magnifyingGlasses = "🔍".repeat(attemptsUsed)
    
    if (isWin) {
      // If won, show result and remaining aliens (5 total - attempts used - 1 for result)
      const remainingAliens = "👾".repeat(Math.max(0, 5 - attemptsUsed - 1))
      return `${magnifyingGlasses}✅${remainingAliens}`
    } else {
      // If lost/gave up, show 4 magnifying glasses and one X (always 5 total)
      return "🔍🔍🔍🔍❌"
    }
  }

  async generateShareText(data: PosterPixelsShareData): Promise<ShareResult> {
    const { attempts, puzzle, result } = data;
    
    // Generate the new emoji format
    const resultEmojis = this.generateResultEmojis(attempts, result.isWin);
    
    // Generate bonus text for special achievements
    const attemptsUsed = this.calculateAttemptsBeforeWin(attempts);
    let bonusText = '';
    
    if (result.isWin && attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      // Get clarity level from the winning attempt
      let clarityPercent = 100; // Default fallback
      if (typeof lastAttempt.clarityLevel === 'number') {
        if (lastAttempt.clarityLevel <= 1) {
          // Convert fraction to percentage
          clarityPercent = Math.round(lastAttempt.clarityLevel * 100);
        } else {
          // Already a percentage
          clarityPercent = Math.round(lastAttempt.clarityLevel);
        }
      }
      
      bonusText = `Guess with ${clarityPercent}% clarity`;
      
      if (attemptsUsed === 0) {
        bonusText = `First guess! ${bonusText}`;
      }
    }
    
    const score = result.isWin ? (result.finalScore || 0) : 0;
    
    let shareText = `Poster Pixels #${puzzle.puzzleNumber} ${resultEmojis}`;
    if (bonusText) {
      shareText += `\n${bonusText}`;
    }
    shareText += `\n${score} pts`;
    
    const shareUrl = `${this.config.baseUrl}/game/${this.config.gameSlug}`;

    return {
      shareText,
      shareUrl,
      metadata: {
        puzzleNumber: puzzle.puzzleNumber,
        gameSpecific: {
          isWin: result.isWin,
          finalScore: result.finalScore,
          timedOut: result.timedOut,
          attempts: attempts.length,
        },
      },
    };
  }
}

export function createPosterPixelsShareGenerator(baseUrl: string = 'https://cinamini.app'): PosterPixelsShareGenerator {
  return new PosterPixelsShareGenerator({
    baseUrl,
    gameSlug: 'poster-pixels',
  });
}