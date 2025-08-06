/**
 * Poster Pixels Game Share Generator
 * 
 * Generates share text for the Poster Pixels game (progressive poster clarity guessing)
 */

import type { PosterPixelsShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';

export class PosterPixelsShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  async generateShareText(data: PosterPixelsShareData): Promise<ShareResult> {
    const { attempts, puzzle, result } = data;
    
    let pattern = '';
    let resultText = '';
    
    if (attempts.length === 0 || result.timedOut) {
      // No attempts made or timed out: "Poster Pixels #X ❌\nRan out of time! ⌛"
      pattern = '❌';
      resultText = result.timedOut ? 'Ran out of time! ⌛' : 'Did not guess';
    } else {
      const lastAttempt = attempts[attempts.length - 1];
      const solveTimeSeconds = lastAttempt.solveTimeMs ? Math.round(lastAttempt.solveTimeMs / 1000) : 0;
      
      if (lastAttempt.isCorrect) {
        // Success: "Poster Pixels #X ✅\nGuessed at Y% clarity in 9s 🖼️"
        pattern = '✅';
        resultText = `Guessed at ${lastAttempt.clarityLevel}% clarity in ${solveTimeSeconds}s 🖼️`;
      } else {
        // Unsuccessful: "Poster Pixels #X ❌\nGuessed at Y% clarity in 9s"
        pattern = '❌';
        resultText = `Guessed at ${lastAttempt.clarityLevel}% clarity in ${solveTimeSeconds}s`;
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