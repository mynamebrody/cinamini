"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useGameMode } from "@/hooks/use-game-mode"
import { localGameStorage } from "@/lib/local-game-storage"
import AnonymousResultNudge from "../anonymous-result-nudge"
import RetitlePuzzle from "./retitle-puzzle"
import RetitleResult from "./retitle-result"
import RetitleStats from "./retitle-stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { HowToPlayModal } from "../how-to-play-modal"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"

interface PuzzleData {
  id: string
  puzzleDate: string
  puzzleNumber: number
  localizedTitle: string
  englishTranslation: string
  countryCode: string
  countryName: string
  flagEmoji: string
  options: Array<{ id: number; title: string }>
}

interface GuessResult {
  correct: boolean
  correctAnswer: {
    id: number
    title: string
    originalTitle: string
    releaseYear: string
    translationNote: string
  }
  stats: {
    gamesPlayed: number
    accuracy: number
    currentStreak: number
  }
}

type GameState = 'loading' | 'ready' | 'playing' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

export default function RetitleGame() {
  const { user, isAnonymous, loading: authLoading } = useGameMode()
  const [gameState, setGameState] = useState<GameState>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [result, setResult] = useState<GuessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])

  const loadTodaysPuzzle = async () => {
    try {
      setGameState('loading')
      setError(null)
      
      const response = await fetch("/api/retitled/puzzle/today")
      if (!response.ok) {
        throw new Error("Failed to load puzzle")
      }
      
      const data = await response.json()
      
      // Check if already played today
      if (isAnonymous) {
        // Check local storage for anonymous users
        const hasPlayedToday = localGameStorage.hasPlayedToday('retitled')
        if (hasPlayedToday) {
          const localResult = localGameStorage.getTodayResult('retitled')
          if (localResult?.result) {
            setResult(localResult.result)
            setGameState('completed')
          } else {
            setPuzzle(data.puzzle)
            setGameState('ready')
          }
        } else {
          setPuzzle(data.puzzle)
          // Check if this is the user's first time playing
          const hasPlayedBefore = localStorage.getItem('retitled-played')
          setGameState('ready')
          if (!hasPlayedBefore) {
            setModalState('howtoplay')
          }
        }
      } else if (user && data.hasPlayed) {
        // User has already played today, show the result
        setPuzzle(data.puzzle) // Set puzzle data for the result display
        
        // Try the result API first for full result data
        const resultResponse = await fetch(`/api/retitled/result/${data.puzzle.id}`)
        
        if (resultResponse.ok) {
          const resultData = await resultResponse.json()
          setResult(resultData)
        } else {
          // Fallback: use the guess data and stats API
          const statsResponse = await fetch("/api/retitled/stats")
          let statsData = null
          if (statsResponse.ok) {
            statsData = await statsResponse.json()
          }
          
          // Create result from userGuess data if available
          if (data.userGuess) {
            setResult({
              correct: data.userGuess.isCorrect,
              correctAnswer: {
                id: data.puzzle.filmId || 562, // Use puzzle data or fallback
                title: "See results for details",
                originalTitle: "See results for details",
                releaseYear: "Unknown",
                translationNote: data.puzzle.translationNote || ""
              },
              puzzle: {
                localizedTitle: data.puzzle.localizedTitle,
                countryCode: data.puzzle.countryCode,
                flagEmoji: data.puzzle.flagEmoji
              },
              stats: {
                gamesPlayed: statsData?.stats?.gamesPlayed || 0,
                accuracy: statsData?.stats?.accuracy || 0,
                currentStreak: statsData?.stats?.currentStreak || 0
              }
            })
          } else {
            // No guess data available, but user has played - try to get result another way
            console.warn("User has played but no guess data available")
            setResult({
              correct: false,
              correctAnswer: {
                id: data.puzzle.filmId || 562,
                title: "Result data unavailable",
                originalTitle: "Result data unavailable",
                releaseYear: "Unknown",
                translationNote: ""
              },
              puzzle: {
                localizedTitle: data.puzzle.localizedTitle,
                countryCode: data.puzzle.countryCode,
                flagEmoji: data.puzzle.flagEmoji
              },
              stats: {
                gamesPlayed: statsData?.stats?.gamesPlayed || 0,
                accuracy: statsData?.stats?.accuracy || 0,
                currentStreak: statsData?.stats?.currentStreak || 0
              }
            })
          }
        }
        setGameState('completed')
      } else {
        setPuzzle(data.puzzle)
        // Check if this is the user's first time playing
        const hasPlayedBefore = localStorage.getItem('retitled-played')
        setGameState('ready')
        if (!hasPlayedBefore) {
          setModalState('howtoplay')
        }
      }
    } catch (err) {
      console.error("Error loading puzzle:", err)
      setError("Failed to load today's puzzle. Please try again.")
      setGameState('error')
    }
  }

  const startGame = () => {
    // Mark that the user has played before if coming from how to play
    if (modalState === 'howtoplay') {
      localStorage.setItem('retitled-played', 'true')
    }
    setGameState('playing')
    setStartTime(Date.now())
    setModalState('none')
  }

  const handleGuess = async (guessFilmId: number) => {
    if (!puzzle) return

    const solveTimeMs = Date.now() - startTime

    try {
      if (isAnonymous) {
        // For anonymous users, use the guess API to get the correct answer details
        const response = await fetch("/api/retitled/guess", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            guessFilmId,
            solveTimeMs
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to submit guess")
        }

        const data = await response.json()
        
        // Save to local storage for anonymous users
        localGameStorage.saveDailyResult('retitled', data)
        
        setResult(data)
        setGameState('completed')
      } else {
        // For authenticated users, submit to server
        const response = await fetch("/api/retitled/guess", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            guessFilmId,
            solveTimeMs
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to submit guess")
        }

        const data = await response.json()
        setResult(data)
        setGameState('completed')
      }
    } catch (err) {
      console.error("Error submitting guess:", err)
      setError("Failed to submit your guess. Please try again.")
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
        title="Retitled" 
        onHelpClick={showHowToPlay}
      >
        {(gameState === 'ready' || gameState === 'completed') && !isAnonymous && (
          <Button variant="ghost" size="sm" onClick={showStats}>
            <BarChart3 className="w-4 h-4" />
          </Button>
        )}
      </GameHeader>

      {/* How to Play Modal */}
      <HowToPlayModal
        open={modalState === 'howtoplay'}
        onOpenChange={(open) => setModalState(open ? 'howtoplay' : 'none')}
        title="Retitled"
        instructions={
          <div className="space-y-4">
            <p className="text-neutral-600">
              Test your movie knowledge by identifying English films from their foreign titles!
            </p>
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">How to Play:</h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• You'll see a foreign movie title with a country flag</li>
                <li>• Choose the correct English title from 4-5 options</li>
                <li>• Learn interesting translation trivia along the way</li>
                <li>• One puzzle per day - make it count!</li>
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
          <RetitleStats onClose={() => setModalState('none')} />
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
                <CardTitle>Retitled #{puzzle?.puzzleNumber}</CardTitle>
                <p className="text-muted-foreground">
                  Identify the English film from its foreign title
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Today's Challenge</h3>
                  <p className="text-sm text-muted-foreground">
                    Can you identify the English movie from its foreign title?
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

        {gameState === 'playing' && puzzle && (
          <div className="max-w-4xl mx-auto">
            <RetitlePuzzle 
              puzzle={puzzle}
              onGuess={handleGuess}
              startTime={startTime}
            />
          </div>
        )}

        {gameState === 'completed' && result && (
          <div className="max-w-md mx-auto space-y-4">
            <RetitleResult 
              result={result} 
              puzzleId={puzzle?.id || ""}
            />
            {isAnonymous && (
              <AnonymousResultNudge 
                gameResult={result}
                gameName="Retitled"
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}