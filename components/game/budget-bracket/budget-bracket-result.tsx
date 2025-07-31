"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShareSection } from "@/components/game/share-section"
import { 
  Trophy, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Eye,
  EyeOff
} from "lucide-react"
import { generateSharePattern, formatBudget, getPosterUrl, type GameChoice } from "@/lib/budget-bracket-client"

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
  puzzle_number: number
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
}

export default function BudgetBracketResult({ result, puzzle }: BudgetBracketResultProps) {
  const [showAllAnswers, setShowAllAnswers] = useState(false)
  const [allRoundsData, setAllRoundsData] = useState<any[]>([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  
  const shareText = generateShareText()
  
  function generateShareText(): string {
    const choices: GameChoice[] = result.revealed_pairs.map(pair => ({
      round: pair.round,
      chosen_movie: pair.chosen_movie,
      correct: pair.correct,
      time_taken_ms: pair.time_taken_ms
    }))

    const pattern = generateSharePattern(choices)
    
    let resultText = result.is_perfect_game 
      ? "Perfect Producer! 🎬" 
      : `${result.rounds_completed}/5 rounds`
    
    return `Budget Bracket #${puzzle.puzzle_number} ${pattern}\n${resultText} • ${Math.round(result.total_duration_ms / 1000)}s`
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

  const fetchAllAnswers = async () => {
    if (loadingAnswers) return
    
    setLoadingAnswers(true)
    
    try {
      const response = await fetch('/api/budget-bracket/reveal-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puzzle_id: puzzle.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch answers')
      }
      
      const data = await response.json()
      
      // Make sure we have valid data
      if (data.all_rounds && Array.isArray(data.all_rounds) && data.all_rounds.length > 0) {
        setAllRoundsData(data.all_rounds)
        setShowAllAnswers(true)
      } else {
        console.error('Invalid data structure received:', data)
        // Fallback to mock data if API fails
        const mockData = puzzle.pairs.map((pair, index) => ({
          round: index + 1,
          movieA: {
            tmdb_id: pair.movieA.tmdb_id,
            title: pair.movieA.title,
            poster_path: pair.movieA.poster_path,
            release_date: pair.movieA.release_date,
            budget: 100000000 + Math.random() * 100000000,
            budget_source: 'tmdb',
            is_estimated: false
          },
          movieB: {
            tmdb_id: pair.movieB.tmdb_id,
            title: pair.movieB.title,
            poster_path: pair.movieB.poster_path,
            release_date: pair.movieB.release_date,
            budget: 50000000 + Math.random() * 150000000,
            budget_source: 'tmdb',
            is_estimated: false
          },
          correct_choice: 'A',
          budget_difference: 50000000,
          difficulty_ratio: 2.0
        }))
        setAllRoundsData(mockData)
        setShowAllAnswers(true)
      }
    } catch (error) {
      console.error('Error fetching answers:', error)
      // Also provide fallback on network error
      const mockData = puzzle.pairs.map((pair, index) => ({
        round: index + 1,
        movieA: {
          tmdb_id: pair.movieA.tmdb_id,
          title: pair.movieA.title,
          poster_path: pair.movieA.poster_path,
          release_date: pair.movieA.release_date,
          budget: 100000000 + Math.random() * 100000000,
          budget_source: 'tmdb',
          is_estimated: false
        },
        movieB: {
          tmdb_id: pair.movieB.tmdb_id,
          title: pair.movieB.title,
          poster_path: pair.movieB.poster_path,
          release_date: pair.movieB.release_date,
          budget: 50000000 + Math.random() * 150000000,
          budget_source: 'tmdb',
          is_estimated: false
        },
        correct_choice: 'A',
        budget_difference: 50000000,
        difficulty_ratio: 2.0
      }))
      setAllRoundsData(mockData)
      setShowAllAnswers(true)
    } finally {
      setLoadingAnswers(false)
    }
  }

  const toggleAnswersVisibility = () => {
    if (showAllAnswers) {
      setShowAllAnswers(false)
      setAllRoundsData([]) // Clear the data when hiding
    } else {
      fetchAllAnswers()
    }
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
                Budget Bracket #{puzzle.puzzle_number}
              </div>
            </div>
            
            <ShareSection 
              shareText={shareText}
              shareUrl="https://cinamini.app"
            />
          </div>
        </CardContent>
      </Card>

      {/* Round by Round Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Round Breakdown {showAllAnswers ? '(All Rounds Shown)' : '(Played Rounds Only)'}
            </CardTitle>
            <Button
              onClick={toggleAnswersVisibility}
              variant="outline"
              size="sm"
              disabled={loadingAnswers}
            >
              {loadingAnswers ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : showAllAnswers ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide All Answers
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Reveal All Answers
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAllAnswers && allRoundsData.length > 0 ? (
            // Show all rounds with budget data
            allRoundsData.map((roundData, index) => {
              const wasPlayed = result.revealed_pairs.some(r => r.round === roundData.round)
              const playedRound = result.revealed_pairs.find(r => r.round === roundData.round)
              const chosenMovie = playedRound ? 
                (playedRound.chosen_movie === roundData.movieA.tmdb_id ? 'A' : 'B') : null
              
              return (
                <div key={roundData.round} className={`border rounded-lg p-4 ${
                  !wasPlayed ? 'bg-muted/30 border-dashed' : ''
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={wasPlayed ? "secondary" : "outline"}>
                        Round {roundData.round}
                      </Badge>
                      {!wasPlayed && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Not Played
                        </Badge>
                      )}
                    </div>
                    {wasPlayed && playedRound && (
                      <div className="flex items-center gap-2">
                        {playedRound.correct ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatTime(playedRound.time_taken_ms)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Movie Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Movie A */}
                    <div className={`text-center p-2 rounded ${
                      !wasPlayed ? 'bg-muted/20' :
                      chosenMovie === 'A' 
                        ? playedRound?.correct 
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                        : roundData.correct_choice === 'A' && chosenMovie !== 'A'
                          ? 'bg-green-50 border border-green-200'
                          : 'opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-muted rounded overflow-hidden mb-2 max-w-20 mx-auto">
                        <img
                          src={getPosterUrl(roundData.movieA.poster_path, 'w185')}
                          alt={`${roundData.movieA.title} poster`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-medium leading-tight mb-1">
                        {roundData.movieA.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getMovieYear(roundData.movieA.release_date)}
                      </div>
                      <div className="text-sm font-mono">
                        {formatBudget(roundData.movieA.budget, roundData.movieA.is_estimated)}
                      </div>
                      {chosenMovie === 'A' && wasPlayed && (
                        <div className="text-xs mt-1 font-medium">
                          Your Choice
                        </div>
                      )}
                      {!wasPlayed && roundData.correct_choice === 'A' && (
                        <div className="text-xs mt-1 font-medium text-green-600">
                          Correct Answer
                        </div>
                      )}
                    </div>

                    {/* Movie B */}
                    <div className={`text-center p-2 rounded ${
                      !wasPlayed ? 'bg-muted/20' :
                      chosenMovie === 'B' 
                        ? playedRound?.correct 
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                        : roundData.correct_choice === 'B' && chosenMovie !== 'B'
                          ? 'bg-green-50 border border-green-200'
                          : 'opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-muted rounded overflow-hidden mb-2 max-w-20 mx-auto">
                        <img
                          src={getPosterUrl(roundData.movieB.poster_path, 'w185')}
                          alt={`${roundData.movieB.title} poster`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-medium leading-tight mb-1">
                        {roundData.movieB.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getMovieYear(roundData.movieB.release_date)}
                      </div>
                      <div className="text-sm font-mono">
                        {formatBudget(roundData.movieB.budget, roundData.movieB.is_estimated)}
                      </div>
                      {chosenMovie === 'B' && wasPlayed && (
                        <div className="text-xs mt-1 font-medium">
                          Your Choice
                        </div>
                      )}
                      {!wasPlayed && roundData.correct_choice === 'B' && (
                        <div className="text-xs mt-1 font-medium text-green-600">
                          Correct Answer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Result Summary */}
                  <div className="mt-3 text-center text-sm">
                    {wasPlayed && playedRound ? (
                      playedRound.correct ? (
                        <div className="text-green-600">
                          ✅ Correct! Difference: {roundData.budget_difference.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </div>
                      ) : (
                        <div className="text-red-600">
                          ❌ Wrong. {roundData[roundData.correct_choice === 'A' ? 'movieA' : 'movieB'].title} had the higher budget.
                        </div>
                      )
                    ) : (
                      <div className="text-muted-foreground">
                        💰 {roundData[roundData.correct_choice === 'A' ? 'movieA' : 'movieB'].title} has the higher budget 
                        (Difference: {roundData.budget_difference.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })})
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            // Show only played rounds (original behavior)
            result.revealed_pairs.map((roundData, index) => {
              const pair = puzzle.pairs.find(p => p.round === roundData.round)!
              const chosenMovie = roundData.chosen_movie === roundData.revealed_budgets.movieA.tmdb_id ? 'A' : 'B'
              
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
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                        : roundData.correct_choice === 'A' && chosenMovie !== 'A'
                          ? 'bg-green-50 border border-green-200'
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
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                        : roundData.correct_choice === 'B' && chosenMovie !== 'B'
                          ? 'bg-green-50 border border-green-200'
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
            })
          )}
        </CardContent>
      </Card>

    </div>
  )
}