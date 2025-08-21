/**
 * Budget Bracket Game Share Generator
 * 
 * Generates share text for the Budget Bracket game (movie budget comparison)
 */

import type { BudgetBracketShareData, ShareResult, ShareGenerator, ShareGeneratorConfig } from '../types';

export class BudgetBracketShareGenerator implements ShareGenerator {
  constructor(private config: ShareGeneratorConfig) {}

  async generateShareText(data: BudgetBracketShareData): Promise<ShareResult> {
    const { rounds, puzzle, result } = data;
    
    // Generate pattern (🟩🟩🟥🟩🟩)
    const pattern = rounds
      .sort((a, b) => a.round - b.round)
      .map(round => round.correct ? '🟩' : '🟥')
      .join('');
    
    const correctAnswers = rounds.filter(r => r.correct).length;
    const timeText = `${Math.round(result.totalDurationMs / 1000)}s`;
    
    let shareText: string;
    
    const nameSuffix = puzzle.name ? ` ${puzzle.name}` : '';
    if (result.isPerfectGame) {
      // Perfect: "Budget Bracket #X 🟩🟩🟩🟩🟩\nPerfect Producer! 🏆 • 5/5 correct • 17s"
      shareText = `Budget Bracket #${puzzle.puzzleNumber}${nameSuffix} ${pattern}\nPerfect Producer! 🏆 • 5/5 correct • ${timeText}`;
    } else if (correctAnswers === 0) {
      // Lost: "Budget Bracket #X 🟥🟥🟥🟥🟥\nWhomp, whomp 🎺 • 0/5 correct • 13s"
      shareText = `Budget Bracket #${puzzle.puzzleNumber}${nameSuffix} ${pattern}\nWhomp, whomp 🎺 • 0/5 correct • ${timeText}`;
    } else {
      // Partial: "Budget Bracket #X 🟩🟩🟥🟩🟩\n4/5 correct • 13s"
      shareText = `Budget Bracket #${puzzle.puzzleNumber}${nameSuffix} ${pattern}\n${correctAnswers}/5 correct • ${timeText}`;
    }
    
    const shareUrl = `${this.config.baseUrl}/game/${this.config.gameSlug}`;

    return {
      shareText,
      shareUrl,
      metadata: {
        puzzleNumber: puzzle.puzzleNumber,
        gameSpecific: {
          correctAnswers,
          isPerfectGame: result.isPerfectGame,
          totalDurationMs: result.totalDurationMs,
          pattern,
        },
      },
    };
  }
}

export function createBudgetBracketShareGenerator(baseUrl: string = 'https://cinamini.app'): BudgetBracketShareGenerator {
  return new BudgetBracketShareGenerator({
    baseUrl,
    gameSlug: 'budget-bracket',
  });
}