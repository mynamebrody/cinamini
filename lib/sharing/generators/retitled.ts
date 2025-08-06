/**
 * Retitled Game Share Generator
 * 
 * Generates share text for the Retitled game (localized movie title guessing)
 */

import { getCountryFlag } from '@/lib/flag-emojis';
import type { RetitledShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';

export class RetitledShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  async generateShareText(data: RetitledShareData): Promise<ShareResult> {
    const { guess, puzzle } = data;
    
    // Get flag emoji
    const flagEmoji = getCountryFlag(puzzle.countryCode);
    
    // Generate result emoji
    const resultEmoji = guess.isCorrect ? '✅' : '❌';
    
    // Format solve time
    const solveTimeSeconds = Math.round(guess.solveTimeMs / 1000);
    const timeText = `${solveTimeSeconds}s`;

    // Generate share text in the format: "Retitled #X 🇮🇹 ✅ • 13s"
    const shareText = `Retitled #${puzzle.puzzleNumber} ${flagEmoji} ${resultEmoji} • ${timeText}`;
    
    const shareUrl = `${this.config.baseUrl}/game/${this.config.gameSlug}`;

    return {
      shareText,
      shareUrl,
      metadata: {
        puzzleNumber: puzzle.puzzleNumber,
        gameSpecific: {
          countryCode: puzzle.countryCode,
          isCorrect: guess.isCorrect,
          solveTimeMs: guess.solveTimeMs,
        },
      },
    };
  }
}

export function createRetitledShareGenerator(baseUrl: string = 'https://cinamini.app'): RetitledShareGenerator {
  return new RetitledShareGenerator({
    baseUrl,
    gameSlug: 'retitled',
  });
}