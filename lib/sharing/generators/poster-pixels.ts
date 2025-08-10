/**
 * Poster Pixels Game Share Generator
 * 
 * Generates share text for the Poster Pixels game (progressive poster clarity guessing)
 */

import type { PosterPixelsShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';

export class PosterPixelsShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  private interpretZooms(clarityLevel: number | undefined): number {
    if (!clarityLevel && clarityLevel !== 0) return 1
    // If the value is in [1..5], treat as zoom count
    if (clarityLevel > 0 && clarityLevel <= 5) return Math.round(clarityLevel)
    // If looks like fraction 0..1 -> map to steps
    if (clarityLevel > 0 && clarityLevel <= 1) {
      const percent = Math.round(clarityLevel * 100)
      if (percent <= 10) return 1
      if (percent <= 25) return 2
      if (percent <= 50) return 3
      if (percent <= 80) return 4
      return 5
    }
    // If looks like percentage 5..100
    if (clarityLevel > 1) {
      const percent = Math.round(clarityLevel)
      if (percent <= 10) return 1
      if (percent <= 25) return 2
      if (percent <= 50) return 3
      if (percent <= 80) return 4
      return 5
    }
    return 1
  }

  async generateShareText(data: PosterPixelsShareData): Promise<ShareResult> {
    const { attempts, puzzle, result } = data;
    
    let pattern = '';
    let resultText = '';
    
    if (attempts.length === 0 || result.timedOut) {
      // No attempts made or timed out
      pattern = '❌';
      const zooms = this.interpretZooms(undefined)
      resultText = `Used ${zooms} 🔍 👾`;
    } else {
      const lastAttempt = attempts[attempts.length - 1];
      const zooms = this.interpretZooms(lastAttempt.clarityLevel as unknown as number);
      
      if (lastAttempt.isCorrect) {
        // Success: show zooms used
        pattern = '✅';
        resultText = `Solved in ${zooms} 🔍 👾`;
      } else {
        // Unsuccessful: show zooms used
        pattern = '❌';
        resultText = `Used ${zooms} 🔍 👾`;
      }
    }
    
    const shareText = `Poster Pixels #${puzzle.puzzleNumber} ${pattern}\n${resultText}`;
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