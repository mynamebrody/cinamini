"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import RetitlePuzzle from "./retitle-puzzle"
import RetitleResult from "./retitle-result"
import RetitleStats from "./retitle-stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trophy, Play, BarChart3 } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"

interface PuzzleData {
  id: string
  puzzleDate: string
  puzzleNumber: number
  localizedTitle: string
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

type GameState = 'loading' | 'start' | 'playing' | 'paused' | 'completed' | 'stats' | 'error'

export default function RetitleGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>('loading')
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [pausedTime, setPausedTime] = useState<number>(0)
  const [result, setResult] = useState<GuessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodaysPuzzle()
  }, [])

  const loadTodaysPuzzle = async () => {
    try {
      setGameState('loading')
      setError(null)
      
      const response = await fetch("/api/retitled/puzzle/today")
      if (!response.ok) {
        throw new Error("Failed to load puzzle")
      }
      
      const data = await response.json()
      
      if (data.hasPlayed && data.userGuess) {
        // User has already played today, show the result
        // Fetch the result data using the new result API
        const resultResponse = await fetch(`/api/retitled/result/${data.puzzle.id}`)
        
        if (resultResponse.ok) {
          const resultData = await resultResponse.json()
          setResult(resultData)
        } else {
          // Fallback: fetch stats and create a basic result
          const statsResponse = await fetch("/api/retitled/stats")
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            setResult({
              correct: data.userGuess.isCorrect,
              correctAnswer: {
                id: 562, // Default to Die Hard
                title: "Die Hard",
                originalTitle: "Die Hard",
                releaseYear: "1988",
                translationNote: "The French title translates to 'Crystal Trap'"
              },
              stats: {
                gamesPlayed: statsData.stats.gamesPlayed,
                accuracy: statsData.stats.accuracy,
                currentStreak: statsData.stats.currentStreak
              }
            })
          }
        }
        setGameState('completed')
      } else {
        setPuzzle(data.puzzle)
        setGameState('start')
      }
    } catch (err) {
      console.error("Error loading puzzle:", err)
      setError("Failed to load today's puzzle. Please try again.")
      setGameState('error')
    }
  }

  const startGame = () => {
    setGameState('playing')
    setStartTime(Date.now())
  }

  const handleGuess = async (guessFilmId: number) => {
    if (!puzzle) return

    const solveTimeMs = Date.now() - startTime

    try {
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
    } catch (err) {
      console.error("Error submitting guess:", err)
      setError("Failed to submit your guess. Please try again.")
      setGameState('error')
    }
  }

  const showStats = () => {
    setGameState('stats')
  }

  const backToGame = () => {
    if (result) {
      setGameState('completed')
    } else {
      setGameState('start')
    }
  }

  const goHome = () => {
    router.push('/')
  }

  const pauseGame = () => {
    if (gameState === 'playing') {
      setPausedTime(Date.now())
      setGameState('paused')
    }
  }

  const resumeGame = () => {
    if (gameState === 'paused') {
      // Adjust start time to account for pause duration
      const pauseDuration = Date.now() - pausedTime
      setStartTime(startTime + pauseDuration)
      setGameState('playing')
    }
  }

  if (gameState === 'loading') {
    return (
      <div className="game-container">
        <header className="game-header">
          <div></div>
          <h1 className="game-title">Retitle</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-pulse text-lg">Loading today's puzzle...</div>
          </div>
        </main>
      </div>
    )
  }

  if (gameState === 'error') {
    return (
      <div className="game-container">
        <header className="game-header">
          <div></div>
          <h1 className="game-title">Retitle</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={loadTodaysPuzzle} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (gameState === 'stats') {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={backToGame}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="game-title">Stats</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto">
            <RetitleStats onClose={() => setGameState('stats')} />
          </div>
        </main>
      </div>
    )
  }

  if (gameState === 'completed') {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={goHome}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="game-title">Retitle</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={showStats}>
              <BarChart3 className="w-4 h-4" />
            </Button>
            <GameSettingsButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto">
            {result && (
              <RetitleResult 
                result={result} 
                puzzleId={puzzle?.id || ""}
              />
            )}
          </div>
        </main>
      </div>
    )
  }

  if (gameState === 'paused') {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => setGameState('start')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            End Game
          </Button>
          <h1 className="game-title">Retitle</h1>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Paused
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Game Paused</CardTitle>
              <p className="text-muted-foreground">
                Take your time to think
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={resumeGame} className="w-full" size="lg">
                <Play className="w-4 h-4 mr-2" />
                Resume Game
              </Button>
              <Button onClick={() => setGameState('start')} variant="outline" className="w-full">
                End Game
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (gameState === 'playing') {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => setGameState('start')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="game-title">Retitle</h1>
          <GameSettingsButton onPause={pauseGame} isPaused={false} />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            {puzzle && (
              <RetitlePuzzle 
                puzzle={puzzle}
                onGuess={handleGuess}
                startTime={startTime}
              />
            )}
          </div>
        </main>
      </div>
    )
  }

  // Start screen
  return (
    <div className="game-container">
      <header className="game-header">
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
        <h1 className="game-title">Retitle</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={showStats}>
            <BarChart3 className="w-4 h-4" />
          </Button>
          <GameSettingsButton />
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Retitle #{puzzle?.puzzleNumber}</CardTitle>
              <p className="text-muted-foreground">
                Identify the English film from its foreign title
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">How to Play:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• See a foreign movie title with a country flag</li>
                  <li>• Choose the correct English title from the options</li>
                  <li>• Learn interesting translation trivia along the way</li>
                  <li>• One puzzle per day - make it count!</li>
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
      </main>
    </div>
  )
}