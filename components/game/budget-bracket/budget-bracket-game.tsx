"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import BudgetBracketRound from "./budget-bracket-round"
import BudgetBracketResult from "./budget-bracket-result"
import BudgetBracketStats from "./budget-bracket-stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Play, BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { HowToPlayModal } from "../how-to-play-modal"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import { type GameChoice } from "@/lib/budget-bracket-client"
import { useGameMode } from "@/hooks/use-game-mode"
import { localGameStorage } from "@/lib/local-game-storage"
import AnonymousResultNudge from "../anonymous-result-nudge"

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

type GameState = 'loading' | 'ready' | 'playing' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

export default function BudgetBracketGame() {
  const { user, isAnonymous, loading: authLoading } = useGameMode()
  const [gameState, setGameState] = useState<GameState>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [gameChoices, setGameChoices] = useState<GameChoice[]>([])
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])

  const fetchCompletedGameResult = async (puzzleId: number) => {
    try {
      const response = await fetch('/api/budget-bracket/completed-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzle_id: puzzleId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch completed game result')
      }

      const result: GameResult = await response.json()
      setGameResult(result)
      setGameState('completed')
    } catch (error) {
      console.error('Error fetching completed game result:', error)
      // Fallback to completed state without detailed result
      setGameState('completed')
    }
  }

  const loadTodaysPuzzle = async () => {
    try {
      setGameState('loading')
      const response = await fetch('/api/budget-bracket/puzzle/today')
      
      if (!response.ok) {
        throw new Error('Failed to load puzzle')
      }

      const puzzleData: PuzzleData = await response.json()
      setPuzzle(puzzleData)

      // Check if already played today
      if (isAnonymous) {
        // Check local storage for anonymous users
        const hasPlayedToday = localGameStorage.hasPlayedToday('budget-bracket')
        if (hasPlayedToday) {
          const localResult = localGameStorage.getTodayResult('budget-bracket')
          if (localResult?.result) {
            setGameResult(localResult.result)
            setGameState('completed')
          } else {
            setGameState('ready')
          }
        } else {
          // Check if this is the user's first time playing
          const hasPlayedBefore = localStorage.getItem('budget-bracket-played')
          setGameState('ready')
          if (!hasPlayedBefore) {
            setModalState('howtoplay')
          }
        }
      } else if (user && puzzleData.has_played) {
        // Fetch complete game result for authenticated users who have already played
        await fetchCompletedGameResult(puzzleData.id)
      } else {
        // Check if this is the user's first time playing
        const hasPlayedBefore = localStorage.getItem('budget-bracket-played')
        setGameState('ready')
        if (!hasPlayedBefore) {
          setModalState('howtoplay')
        }
      }
    } catch (error) {
      console.error('Error loading puzzle:', error)
      setError('Failed to load today\'s puzzle. Please try again.')
      setGameState('error')
    }
  }

  const startGame = () => {
    // Mark that the user has played before if coming from how to play
    if (modalState === 'howtoplay') {
      localStorage.setItem('budget-bracket-played', 'true')
    }
    setGameState('playing')
    setCurrentRound(1)
    setGameChoices([])
    setGameStartTime(Date.now())
    setModalState('none')
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

      if (isAnonymous) {
        // For anonymous users, calculate results locally
        const rounds_completed = choices.length
        const lastChoice = choices[choices.length - 1]
        const final_result = rounds_completed === 5 ? 'perfect' : 'lost'
        
        // Create a simplified game result for anonymous users
        const anonymousResult: GameResult = {
          game_id: Date.now(), // Temporary ID
          rounds_completed,
          final_result,
          is_perfect_game: final_result === 'perfect',
          total_duration_ms: totalDuration,
          revealed_pairs: [], // We'll need to populate this if needed
          updated_stats: null
        }
        
        // Save to local storage
        localGameStorage.saveDailyResult('budget-bracket', anonymousResult)
        
        setGameResult(anonymousResult)
        setGameState('completed')
      } else {
        // For authenticated users, submit to server
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
      }
    } catch (error) {
      console.error('Error submitting game:', error)
      setError('Failed to submit game. Please try again.')
      setGameState('error')
    }
  }

  const showStats = () => {
    setModalState('stats')
  }

  const showHowToPlay = () => {
    setModalState('howtoplay')
  }

  // Render the game
  return (
    <div className="game-container">
      <GameHeader 
        title="Budget Bracket" 
        onHelpClick={showHowToPlay}
      >
        {(gameState === 'ready' || gameState === 'completed') && (
          <Button variant="ghost" size="sm" onClick={showStats}>
            <BarChart3 className="w-4 h-4" />
          </Button>
        )}
      </GameHeader>

      {/* How to Play Modal */}
      <HowToPlayModal
        open={modalState === 'howtoplay'}
        onOpenChange={(open) => setModalState(open ? 'howtoplay' : 'none')}
        title="Budget Bracket"
        instructions={
          <div className="space-y-4">
            <p className="text-neutral-600">
              Test your movie budget knowledge in this elimination bracket challenge!
            </p>
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">How to Play:</h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• See two movie posters side-by-side</li>
                <li>• Pick the one with the higher production budget</li>
                <li>• Complete 5 rounds to become a "Perfect Producer"</li>
                <li>• One wrong guess ends the game</li>
              </ul>
            </div>
          </div>
        }
        onStart={startGame}
      />

      {/* Stats Modal */}
      <GameModal
        open={modalState === 'stats'}
        onOpenChange={(open) => setModalState(open ? 'stats' : 'none')}
        className="max-w-lg"
      >
        <GameModalHeader>
          <GameModalTitle>Statistics</GameModalTitle>
        </GameModalHeader>
        <GameModalBody>
          <BudgetBracketStats />
        </GameModalBody>
      </GameModal>

      <main className="flex-1 overflow-auto p-4">
        {gameState === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse text-lg">Loading today's puzzle...</div>
            </div>
          </div>
        )}

        {gameState === 'error' && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={loadTodaysPuzzle} className="w-full">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'ready' && (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Budget Bracket #{puzzle?.puzzle_number}</CardTitle>
                <p className="text-muted-foreground">
                  Pick the movie with the higher production budget
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Today's Challenge</h3>
                  <p className="text-sm text-muted-foreground">
                    Can you pick the bigger budget film in all 5 rounds?
                  </p>
                </div>

                <Button onClick={startGame} className="w-full" size="lg" variant="primary">
                  <Play className="w-4 h-4 mr-2" />
                  Start Playing
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Daily puzzle • {new Date().toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'playing' && puzzle && puzzle.pairs && puzzle.pairs[currentRound - 1] && (
          <div className="max-w-md mx-auto">
            <BudgetBracketRound
              pair={puzzle.pairs[currentRound - 1]}
              round={currentRound}
              onChoice={handleRoundChoice}
              onGameEnd={handleGameEnd}
              gameChoices={gameChoices}
              puzzle={puzzle}
            />
          </div>
        )}

        {gameState === 'playing' && puzzle && (!puzzle.pairs || !puzzle.pairs[currentRound - 1]) && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <p className="text-red-500 mb-4">Error: Missing puzzle data for round {currentRound}</p>
                <Button onClick={loadTodaysPuzzle} className="w-full">
                  Reload Puzzle
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'completed' && (
          <div className="max-w-md mx-auto space-y-4">
            {gameResult && puzzle ? (
              <>
                <BudgetBracketResult 
                  result={gameResult} 
                  puzzle={puzzle}
                />
                {isAnonymous && (
                  <AnonymousResultNudge 
                    gameResult={gameResult}
                    gameName="Budget Bracket"
                  />
                )}
              </>
            ) : puzzle?.has_played && puzzle.user_result ? (
              // Fallback for when detailed result couldn't be fetched
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

                  <Button variant="outline" onClick={showStats} className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Stats
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    Come back tomorrow for a new puzzle!
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Loading or error state
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">Loading your results...</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}