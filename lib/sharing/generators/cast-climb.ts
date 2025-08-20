/**
 * Cast Climb Game Share Generator
 * 
 * Generates share text for the Cast Climb game (movie cast guessing)
 */

import type { CastClimbShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';
import { formatGameTime } from '@/lib/utils';

export class CastClimbShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  async generateShareText(data: CastClimbShareData): Promise<ShareResult> {
    const { guesses, puzzle, result } = data;
    
    const ACTORS_TO_SHOW = 4;
    let pattern = '';
    let resultText = '';
    
    if (result.isWin) {
      // New pattern logic:
      // - Wrong attempts shown as person emojis 🧑 (one per wrong guess before the win)
      // - Then a ✅ when correct
      // - Then remaining reveals as 🎭 until 4 total reveals
      const wrongAttemptsBeforeWin = Math.max(0, guesses.length - 1);
      const remainingActors = Math.max(0, ACTORS_TO_SHOW - guesses.length);

      pattern = '🧑'.repeat(wrongAttemptsBeforeWin) + '✅' + '🎭'.repeat(remainingActors);

      if (guesses.length === 1) {
        resultText = 'Got the 🎬 on the first try! 🥇';
      } else {
        resultText = `Got the 🎬 in ${guesses.length} guesses`;
      }
      
      // Add timing data if available
      if (result.solveTimeMs && result.solveTimeMs > 0) {
        resultText += ` • ${formatGameTime(result.solveTimeMs)}`;
      }
    } else {
      // Loss pattern: four faces then a red X
      // Example: 🧑🧑🧑🧑❌
      pattern = '🧑'.repeat(ACTORS_TO_SHOW) + '❌';
      resultText = "Wasn't able to get the movie."
    }
    
    const shareText = `Cast Climb #${puzzle.puzzleNumber} ${pattern}\n${resultText}`;
    const shareUrl = `${this.config.baseUrl}/game/${this.config.gameSlug}`;

    return {
      shareText,
      shareUrl,
      metadata: {
        puzzleNumber: puzzle.puzzleNumber,
        gameSpecific: {
          isWin: result.isWin,
          totalGuesses: result.totalGuesses,
          pattern,
        },
      },
    };
  }
}

export function createCastClimbShareGenerator(baseUrl: string = 'https://cinamini.app'): CastClimbShareGenerator {
  return new CastClimbShareGenerator({
    baseUrl,
    gameSlug: 'cast-climb',
  });
}