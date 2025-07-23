"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import BudgetBracketRound from "./budget-bracket-round"
import BudgetBracketResult from "./budget-bracket-result"
import BudgetBracketStats from "./budget-bracket-stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trophy, Play, BarChart3 } from "lucide-react"
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
  user_result?: {
    rounds_completed: number
    final_result: string
    choices: GameChoice[]
    total_duration_ms: number
  }
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

type GameState = 'loading' | 'start' | 'playing' | 'completed' | 'already_played' | 'stats' | 'error'

export default function BudgetBracketGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>('loading')
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [gameChoices, setGameChoices] = useState<GameChoice[]>([])
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodaysPuzzle()
  }, [])

  const loadTodaysPuzzle = async () => {
    try {
      setGameState('loading')
      const response = await fetch('/api/budget-bracket/puzzle/today')
      
      if (!response.ok) {
        throw new Error('Failed to load puzzle')
      }

      const puzzleData: PuzzleData = await response.json()
      setPuzzle(puzzleData)

      if (puzzleData.has_played) {
        setGameState('already_played')
      } else {
        setGameState('start')
      }
    } catch (error) {
      console.error('Error loading puzzle:', error)
      setError('Failed to load today\'s puzzle. Please try again.')
      setGameState('error')
    }
  }

  const startGame = () => {
    setGameState('playing')
    setCurrentRound(1)
    setGameChoices([])
    setGameStartTime(Date.now())
  }

  const handleRoundChoice = (chosenMovieTmdbId: number, timeTaken: number) => {
    const newChoice: GameChoice = {
      round: currentRound,
      chosen_movie: chosenMovieTmdbId,
      correct: false, // Will be verified by server
      time_taken_ms: timeTaken
    }

    const updatedChoices = [...gameChoices, newChoice]
    setGameChoices(updatedChoices)

    // Add a delay to show feedback before determining next action
    setTimeout(() => {
      // We need to check if the answer was correct to decide what to do
      // For now, we'll determine this by checking the actual budgets
      // This is temporary - ideally this logic should be in the API
      fetchMovieBudgetsAndContinue(updatedChoices, chosenMovieTmdbId)
    }, 2000) // 2 second delay to show feedback
  }

  const handleGameEnd = (choices: GameChoice[]) => {
    // Game ended early due to wrong answer
    submitGame(choices)
  }

  const fetchMovieBudgetsAndContinue = async (choices: GameChoice[], chosenMovieTmdbId: number) => {
    try {
      const currentPair = puzzle!.pairs[currentRound - 1]
      const response = await fetch('/api/budget-bracket/movie-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieA_tmdb_id: currentPair.movieA.tmdb_id,
          movieB_tmdb_id: currentPair.movieB.tmdb_id
        })
      })

      if (response.ok) {
        const budgetData = await response.json()
        const movieABudget = budgetData.movieA.budget
        const movieBBudget = budgetData.movieB.budget
        
        // Determine if the choice was correct
        const chosenMovieA = chosenMovieTmdbId === currentPair.movieA.tmdb_id
        const chosenBudget = chosenMovieA ? movieABudget : movieBBudget
        const otherBudget = chosenMovieA ? movieBBudget : movieABudget
        const isCorrect = chosenBudget > otherBudget
        
        if (isCorrect) {
          // Correct answer - continue to next round or finish game
          if (currentRound < 5) {
            setCurrentRound(currentRound + 1)
          } else {
            // Game complete with perfect score
            submitGame(choices)
          }
        } else {
          // Wrong answer - end game immediately
          submitGame(choices)
        }
      } else {
        // API error - just continue for now
        if (currentRound < 5) {
          setCurrentRound(currentRound + 1)
        } else {
          submitGame(choices)
        }
      }
    } catch (error) {
      console.error('Error fetching budget data for game logic:', error)
      // Error - just continue for now
      if (currentRound < 5) {
        setCurrentRound(currentRound + 1)
      } else {
        submitGame(choices)
      }
    }
  }

  const submitGame = async (choices: GameChoice[]) => {
    try {
      const totalDuration = Date.now() - gameStartTime

      const response = await fetch('/api/budget-bracket/submit-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzle_id: puzzle!.id,
          choices,
          total_duration_ms: totalDuration
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit game')
      }

      const result: GameResult = await response.json()
      setGameResult(result)
      setGameState('completed')
    } catch (error) {
      console.error('Error submitting game:', error)
      setError('Failed to submit game. Please try again.')
      setGameState('error')
    }
  }

  const showStats = () => {
    setGameState('stats')
  }

  const backToGame = () => {
    if (puzzle?.has_played) {
      setGameState('already_played')
    } else {
      setGameState('start')
    }
  }

  const goHome = () => {
    router.push('/')
  }

  if (gameState === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Budget Bracket</h1>
          <div className="animate-pulse">Loading today's puzzle...</div>
        </div>
      </div>
    )
  }

  if (gameState === 'error') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Budget Bracket</h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={loadTodaysPuzzle} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === 'stats') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={backToGame}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Stats</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
        <BudgetBracketStats />
      </div>
    )
  }

  if (gameState === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={goHome}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="text-xl font-bold">Budget Bracket</h1>
          <Button variant="ghost" onClick={showStats}>
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
        <BudgetBracketResult 
          result={gameResult!} 
          puzzle={puzzle!}
          onShowStats={showStats}
        />
      </div>
    )
  }

  if (gameState === 'already_played') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={goHome}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="text-xl font-bold">Budget Bracket</h1>
          <Button variant="ghost" onClick={showStats}>
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Already Played Today!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              You've completed today's Budget Bracket puzzle.
            </div>
            
            {puzzle?.user_result && (
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Your Result:</div>
                <div className="text-lg">
                  {puzzle.user_result.rounds_completed === 5 ? (
                    <span className="text-green-500 font-bold">Perfect Producer! 🎬</span>
                  ) : (
                    <span>Rounds completed: {puzzle.user_result.rounds_completed}/5</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Time: {Math.round(puzzle.user_result.total_duration_ms / 1000)}s
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={showStats} className="flex-1">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Stats
              </Button>
              <Button onClick={goHome} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Come back tomorrow for a new puzzle!
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameState === 'playing') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setGameState('start')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Budget Bracket</h1>
          <div className="text-sm text-muted-foreground">
            Round {currentRound}/5
          </div>
        </div>
        
        <BudgetBracketRound
          pair={puzzle!.pairs[currentRound - 1]}
          round={currentRound}
          onChoice={handleRoundChoice}
          onGameEnd={handleGameEnd}
          gameChoices={gameChoices}
          puzzle={puzzle!}
        />
      </div>
    )
  }

  // Start screen
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={goHome}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
        <h1 className="text-xl font-bold">Budget Bracket</h1>
        <Button variant="ghost" onClick={showStats}>
          <BarChart3 className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Budget Bracket #{puzzle?.seed_value.slice(0, 6)}</CardTitle>
          <p className="text-muted-foreground">
            Pick the movie with the higher production budget
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-2">How to Play:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• See two movie posters side-by-side</li>
              <li>• Pick the one with the higher production budget</li>
              <li>• Complete 5 rounds to become a "Perfect Producer"</li>
              <li>• One wrong guess ends the game</li>
            </ul>
          </div>

          <Button onClick={startGame} className="w-full" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Start Playing
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Daily puzzle • {new Date().toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}