"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, 
  Share2, 
  BarChart3, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check
} from "lucide-react"
import { generateSharePattern, formatBudget, getPosterUrl } from "@/lib/budget-bracket"
import { type GameChoice } from "@/lib/budget-bracket"

interface PuzzleMovie {
  tmdb_id: number
  title: string
  poster_path: string | null
  release_date: string
}

interface PuzzlePair {
  round: number
  movieA: PuzzleMovie
  movieB: PuzzleMovie
}

interface PuzzleData {
  id: number
  puzzle_date: string
  seed_value: string
  pairs: PuzzlePair[]
  has_played: boolean
}

interface GameResult {
  game_id: number
  rounds_completed: number
  final_result: string
  is_perfect_game: boolean
  total_duration_ms: number
  revealed_pairs: Array<{
    round: number
    chosen_movie: number
    correct: boolean
    time_taken_ms: number
    revealed_budgets: {
      movieA: { tmdb_id: number; title: string; budget: number; budget_source: string; is_estimated: boolean }
      movieB: { tmdb_id: number; title: string; budget: number; budget_source: string; is_estimated: boolean }
    }
    correct_choice: 'A' | 'B'
    budget_difference: number
    difficulty_ratio: number
  }>
  updated_stats: any
}

interface BudgetBracketResultProps {
  result: GameResult
  puzzle: PuzzleData
  onShowStats: () => void
}

export default function BudgetBracketResult({ result, puzzle, onShowStats }: BudgetBracketResultProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const shareText = generateShareText()
  
  function generateShareText(): string {
    const choices: GameChoice[] = result.revealed_pairs.map(pair => ({
      round: pair.round,
      chosen_movie: pair.chosen_movie,
      correct: pair.correct,
      time_taken_ms: pair.time_taken_ms
    }))

    const pattern = generateSharePattern(choices)
    const seedDisplay = puzzle.seed_value.slice(0, 6).toUpperCase()
    
    let resultText = result.is_perfect_game 
      ? "Perfect Producer! 🎬" 
      : `${result.rounds_completed}/5 rounds`
    
    return `Budget Bracket #${seedDisplay} ${pattern}\n${resultText} • ${Math.round(result.total_duration_ms / 1000)}s\nCinaMini.app`
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Budget Bracket',
          text: shareText,
          url: 'https://CinaMini.app'
        })
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getMovieYear = (releaseDate: string) => {
    return new Date(releaseDate).getFullYear()
  }

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {result.is_perfect_game ? (
              <>
                <Trophy className="w-6 h-6 text-yellow-500" />
                Perfect Producer!
              </>
            ) : (
              <>
                <BarChart3 className="w-6 h-6" />
                Game Complete
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Performance Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{result.rounds_completed}</div>
              <div className="text-sm text-muted-foreground">Rounds</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatTime(result.total_duration_ms)}</div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {result.updated_stats?.current_streak || 0}
              </div>
              <div className="text-sm text-muted-foreground">Streak</div>
            </div>
          </div>

          {/* Share Section */}
          <div className="border-t pt-4">
            <div className="text-center mb-3">
              <div className="text-lg font-mono tracking-wider mb-2">
                {generateSharePattern(result.revealed_pairs.map(p => ({
                  round: p.round,
                  chosen_movie: p.chosen_movie,
                  correct: p.correct,
                  time_taken_ms: p.time_taken_ms
                })))}
              </div>
              <div className="text-sm text-muted-foreground">
                Budget Bracket #{puzzle.seed_value.slice(0, 6).toUpperCase()}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleShare} 
                className="flex-1"
                variant="default"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Result
              </Button>
              <Button 
                onClick={copyToClipboard} 
                variant="outline"
                size="icon"
              >
                {copiedToClipboard ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Round by Round Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Round Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.revealed_pairs.map((roundData, index) => {
            const pair = puzzle.pairs.find(p => p.round === roundData.round)!
            const chosenMovie = roundData.chosen_movie === roundData.revealed_budgets.movieA.tmdb_id ? 'A' : 'B'
            const otherMovie = chosenMovie === 'A' ? 'B' : 'B'
            
            return (
              <div key={roundData.round} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">Round {roundData.round}</Badge>
                  <div className="flex items-center gap-2">
                    {roundData.correct ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatTime(roundData.time_taken_ms)}
                    </span>
                  </div>
                </div>

                {/* Movie Comparison */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Movie A */}
                  <div className={`text-center p-2 rounded ${
                    chosenMovie === 'A' 
                      ? roundData.correct 
                        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                      : roundData.correct_choice === 'A' && chosenMovie !== 'A'
                        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                        : 'opacity-60'
                  }`}>
                    <div className="aspect-[2/3] bg-muted rounded overflow-hidden mb-2 max-w-20 mx-auto">
                      <img
                        src={getPosterUrl(pair.movieA.poster_path, 'w185')}
                        alt={`${pair.movieA.title} poster`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-xs font-medium leading-tight mb-1">
                      {roundData.revealed_budgets.movieA.title}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {getMovieYear(pair.movieA.release_date)}
                    </div>
                    <div className="text-sm font-mono">
                      {formatBudget(roundData.revealed_budgets.movieA.budget, roundData.revealed_budgets.movieA.is_estimated)}
                    </div>
                    {chosenMovie === 'A' && (
                      <div className="text-xs mt-1 font-medium">
                        Your Choice
                      </div>
                    )}
                  </div>

                  {/* Movie B */}
                  <div className={`text-center p-2 rounded ${
                    chosenMovie === 'B' 
                      ? roundData.correct 
                        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                      : roundData.correct_choice === 'B' && chosenMovie !== 'B'
                        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                        : 'opacity-60'
                  }`}>
                    <div className="aspect-[2/3] bg-muted rounded overflow-hidden mb-2 max-w-20 mx-auto">
                      <img
                        src={getPosterUrl(pair.movieB.poster_path, 'w185')}
                        alt={`${pair.movieB.title} poster`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-xs font-medium leading-tight mb-1">
                      {roundData.revealed_budgets.movieB.title}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {getMovieYear(pair.movieB.release_date)}
                    </div>
                    <div className="text-sm font-mono">
                      {formatBudget(roundData.revealed_budgets.movieB.budget, roundData.revealed_budgets.movieB.is_estimated)}
                    </div>
                    {chosenMovie === 'B' && (
                      <div className="text-xs mt-1 font-medium">
                        Your Choice
                      </div>
                    )}
                  </div>
                </div>

                {/* Result Summary */}
                <div className="mt-3 text-center text-sm">
                  {roundData.correct ? (
                    <div className="text-green-600">
                      ✅ Correct! Difference: {roundData.budget_difference.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </div>
                  ) : (
                    <div className="text-red-600">
                      ❌ Wrong. {roundData.revealed_budgets[roundData.correct_choice === 'A' ? 'movieA' : 'movieB'].title} had the higher budget.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Stats CTA */}
      <Button 
        onClick={onShowStats} 
        variant="outline" 
        className="w-full"
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        View Your Stats
      </Button>
    </div>
  )
}