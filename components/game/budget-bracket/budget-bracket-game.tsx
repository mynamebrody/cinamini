"use client"

import { useState, useEffect } from "react"
import BudgetBracketRound from "./budget-bracket-round"
import BudgetBracketResult from "./budget-bracket-result"
import BudgetBracketStats from "./budget-bracket-stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { GameLanding } from "../game-landing"
import { InstructionCard, InstructionGrid } from "../instruction-card"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import { type GameChoice } from "@/lib/budget-bracket-client"
import { useGameMode } from "@/hooks/use-game-mode"
import { localGameStorage } from "@/lib/local-game-storage"
import AnonymousResultNudge from "../anonymous-result-nudge"
import { MorePuzzlesSection } from "../more-puzzles-section"

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
  const [error, setError] = useState<string | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

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
      } else if (user) {
        // Handle authenticated user states
        if (puzzleData.has_played) {
          // Fetch complete game result for authenticated users who have already played
          await fetchCompletedGameResult(puzzleData.id)
        } else {
          // User hasn't played today
          setGameState('ready')
          
          // Show how-to-play modal only if they've never played Budget Bracket before
          if (!puzzleData.hasPlayedBefore) {
            setModalState('howtoplay')
          }
        }
      } else {
        // Anonymous user
        setGameState('ready')
        
        // Check if this is the user's first time playing
        const hasPlayedBefore = localStorage.getItem('budget-bracket-played')
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
    setModalState('none')
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
        
        // Update the choice with the correct status
        const updatedChoices = choices.map((choice, index) => 
          index === choices.length - 1 ? { ...choice, correct: isCorrect } : choice
        )
        setGameChoices(updatedChoices)
        
        // Always continue to next round or finish game after all 5 rounds
        if (currentRound < 5) {
          setCurrentRound(currentRound + 1)
        } else {
          // Game complete after 5 rounds
          submitGame(updatedChoices)
        }
      } else {
        // API error - assume correct for now and continue
        const updatedChoices = choices.map((choice, index) => 
          index === choices.length - 1 ? { ...choice, correct: true } : choice
        )
        setGameChoices(updatedChoices)
        
        if (currentRound < 4) {
          setCurrentRound(currentRound + 1)
        } else {
          submitGame(updatedChoices)
        }
      }
    } catch (error) {
      console.error('Error fetching budget data for game logic:', error)
      // Error - assume correct for now and continue
      const updatedChoices = choices.map((choice, index) => 
        index === choices.length - 1 ? { ...choice, correct: true } : choice
      )
      setGameChoices(updatedChoices)
      
      if (currentRound < 5) {
        setCurrentRound(currentRound + 1)
      } else {
        submitGame(updatedChoices)
      }
    }
  }

  const submitGame = async (choices: GameChoice[]) => {
    try {
      // Calculate total duration from game start to completion
      const totalDuration = Date.now() - gameStartTime
      
      console.log('Submitting game:', { isAnonymous, user, choices: choices.length })

      // Always call the API to trigger webhooks for both anonymous and authenticated users
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to submit game')
      }

      const result: GameResult = await response.json()

      if (isAnonymous) {
        // For anonymous users, also save to local storage and handle the result differently
        const correctAnswers = choices.filter(choice => choice.correct).length
        let final_result: string
        if (correctAnswers === 5) {
          final_result = 'perfect'
        } else {
          final_result = `${correctAnswers}_out_of_5`
        }

        const revealedPairs = choices.map((choice, index) => {
          const pair = puzzle!.pairs[index]
          return {
            round: choice.round,
            chosen_movie: choice.chosen_movie,
            correct: choice.correct,
            time_taken_ms: choice.time_taken_ms,
            revealed_budgets: {
              movieA: { 
                tmdb_id: pair.movieA.tmdb_id, 
                title: pair.movieA.title, 
                budget: 0, // Will be populated by the result component if needed
                budget_source: 'unknown', 
                is_estimated: false 
              },
              movieB: { 
                tmdb_id: pair.movieB.tmdb_id, 
                title: pair.movieB.title, 
                budget: 0, // Will be populated by the result component if needed
                budget_source: 'unknown', 
                is_estimated: false 
              }
            },
            correct_choice: (choice.chosen_movie === pair.movieA.tmdb_id ? 'A' : 'B') as 'A' | 'B',
            budget_difference: 0, // Will be populated by the result component if needed
            difficulty_ratio: 1.0
          }
        })

        // Create database-compatible structure for easier migration later
        const anonymousResult: GameResult = {
          game_id: Date.now(), // Temporary ID for display
          rounds_completed: 5, // Always 5 rounds now
          final_result,
          is_perfect_game: correctAnswers === 5,
          total_duration_ms: totalDuration,
          revealed_pairs: revealedPairs,
          // Database-compatible game data (budget_bracket_games table)
          game_data: {
            puzzle_id: puzzle!.id,
            rounds_completed: 5,
            final_result,
            choices: choices, // Already in correct format for jsonb column
            total_duration_ms: totalDuration,
            completed_at: new Date().toISOString(),
          },
          updated_stats: {
            current_streak: 1, // Anonymous users start with streak of 1
            games_played: 1,
            perfect_games: correctAnswers === 5 ? 1 : 0
          }
        }

        // Save to local storage
        localGameStorage.saveDailyResult('budget-bracket', anonymousResult)
        
        setGameResult(anonymousResult)
        setGameState('completed')
      } else {
        // For authenticated users, use the server response directly
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


  // Don't render the game container UI if we're showing the landing page
  if (gameState === "ready" && modalState !== 'howtoplay') {
    return (
      <GameLanding
        gameId="budget-bracket"
        gameName="Budget Bracket"
        puzzleNumber={puzzle?.puzzle_number}
        puzzleDate={puzzle?.puzzle_date}
        backgroundColor="#278646"
        logo="/cinamini/games/BudgetBracketPoster.svg"
        logoPng="/cinamini/games/BudgetBracketPoster.png"
        emoji="💰"
        onStart={startGame}
        showBackButton={true}
      >
        {/* How to Play content removed from splash page */}
      </GameLanding>
    )
  }

  // Render the game
  return (
    <div className="game-container">
      <GameHeader 
        title="Budget Bracket" 
        onHelpClick={showHowToPlay}
      >
        {(gameState === 'ready' || gameState === 'completed') && !isAnonymous && (
          <Button variant="ghost" size="sm" onClick={showStats}>
            <BarChart3 className="w-4 h-4" />
          </Button>
        )}
      </GameHeader>

      {/* How to Play Modal */}
      <GameModal
        open={modalState === 'howtoplay'}
        onOpenChange={(open) => setModalState(open ? 'howtoplay' : 'none')}
        className="max-w-2xl"
        backdropColor="rgba(39, 134, 70, 0.3)"
      >
        <GameModalHeader>
          <GameModalTitle>How to Play Budget Bracket</GameModalTitle>
        </GameModalHeader>
        <GameModalBody>
          <InstructionGrid columns={2}>
            <InstructionCard
              step={1}
              title="Face the Bracket"
              description="See two movie posters side-by-side in each round. Your mission: pick the one with the higher production budget."
              darkTheme={true}
              example={
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-16 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">🎥</span>
                  </div>
                  <div className="text-foreground font-bold">VS</div>
                  <div className="w-16 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">🎥</span>
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={2}
              title="Make Your Choice"
              description="Tap the movie you think had the higher budget. Trust your instincts - sometimes the smaller films surprise you!"
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
                    Choose Higher Budget →
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={3}
              title="Survive 5 Rounds"
              description="Complete all 5 budget comparisons. Each wrong choice brings you closer to elimination, but you can still finish all rounds."
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="text-foreground text-sm">
                    Round 3 of 5
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    🟩🟩🟥 (2 correct so far)
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={4}
              title="Perfect Producer"
              description="Get all 5 rounds correct to earn the coveted 'Perfect Producer' status and ultimate bragging rights!"
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="text-foreground text-sm font-mono">
                    Budget Bracket #123 🏆 5/5
                  </div>
                </div>
              }
            />
          </InstructionGrid>
          <div className="mt-6 text-center">
            <Button onClick={() => setModalState('none')} className="btn btn-primary">
              Back to Game
            </Button>
          </div>
        </GameModalBody>
      </GameModal>

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

        {/* Ready state is now handled by the landing page above */}

        {gameState === 'playing' && puzzle && puzzle.pairs && puzzle.pairs[currentRound - 1] && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Game Round */}
            <div className="max-w-md mx-auto">
              <BudgetBracketRound
                pair={puzzle.pairs[currentRound - 1]}
                round={currentRound}
                onChoice={handleRoundChoice}
                gameChoices={gameChoices}
                puzzle={puzzle}
                gameStartTime={gameStartTime}
              />
            </div>
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
          <div className="max-w-4xl mx-auto space-y-6">
            {gameResult && puzzle ? (
              <>
                <div className="max-w-md mx-auto">
                  <BudgetBracketResult 
                    result={gameResult} 
                    puzzle={puzzle}
                  />
                  
                  {/* More Puzzles Section */}
                  <MorePuzzlesSection currentGameId="budget-bracket" />
                  
                  {isAnonymous && (
                    <AnonymousResultNudge 
                      gameResult={gameResult}
                      gameName="Budget Bracket"
                    />
                  )}
                </div>
              </>
            ) : puzzle?.has_played && puzzle.user_result ? (
              // Fallback for when detailed result couldn't be fetched
              <div className="max-w-md mx-auto">
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
                
                {/* More Puzzles Section */}
                <MorePuzzlesSection currentGameId="budget-bracket" />
              </div>
            ) : (
              // Loading or error state
              <div className="max-w-md mx-auto">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Loading your results...</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}