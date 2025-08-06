/**
 * Cast Climb Game Share Generator
 * 
 * Generates share text for the Cast Climb game (movie cast guessing)
 */

import type { CastClimbShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';

export class CastClimbShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  async generateShareText(data: CastClimbShareData): Promise<ShareResult> {
    const { guesses, puzzle, result } = data;
    
    const ACTORS_TO_SHOW = 4;
    let pattern = '';
    let resultText = '';
    
    if (result.isWin) {
      // Show pattern: ❌❌✅🎭 (failed attempts then success, then remaining 🎭)
      const incorrectAttempts = guesses.length - 1;
      const remainingActors = Math.max(0, ACTORS_TO_SHOW - guesses.length);
      
      pattern = '❌'.repeat(incorrectAttempts) + '✅' + '🎭'.repeat(remainingActors);
      
      if (guesses.length === 1) {
        // First try: "Cast Climb #X ✅🎭🎭🎭\nGot the 🎬 on the first try! 🥇"
        resultText = 'Got the 🎬 on the first try! 🥇';
      } else {
        // Multiple tries: "Cast Climb #X ❌✅🎭🎭\nGot the 🎬 in 2 guesses"
        resultText = `Got the 🎬 in ${guesses.length} guesses`;
      }
    } else {
      // All failed attempts: "Cast Climb #X ❌❌❌❌\nWas unable to guess the 🎬!"
      pattern = '❌'.repeat(guesses.length);
      resultText = 'Was unable to guess the 🎬!';
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