"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import RetitlePuzzle from "./retitle-puzzle"
import RetitleResult from "./retitle-result"
import RetitleStats from "./retitle-stats"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"

interface PuzzleData {
  id: string
  puzzleDate: string
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

export default function RetitleGame() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [result, setResult] = useState<GuessResult | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodaysPuzzle()
  }, [])

  const loadTodaysPuzzle = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/retitled/puzzle/today")
      if (!response.ok) {
        throw new Error("Failed to load puzzle")
      }
      
      const data = await response.json()
      
      if (data.hasPlayed && data.userGuess) {
        // User has already played today, show the result
        setHasPlayed(true)
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
      } else {
        setPuzzle(data.puzzle)
        setStartTime(Date.now())
      }
    } catch (err) {
      console.error("Error loading puzzle:", err)
      setError("Failed to load today's puzzle. Please try again.")
    } finally {
      setLoading(false)
    }
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
      setHasPlayed(true)
    } catch (err) {
      console.error("Error submitting guess:", err)
      setError("Failed to submit your guess. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="game-container min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="game-container min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <Button 
          onClick={() => router.push("/")}
          variant="ghost"
          size="sm"
          className="hover:bg-current/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="game-title">Retitle</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowStats(!showStats)}
            variant="ghost"
            size="sm"
            className="hover:bg-current/10"
          >
            <Trophy className="h-4 w-4" />
          </Button>
          <GameSettingsButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          {showStats ? (
            <RetitleStats onClose={() => setShowStats(false)} />
          ) : hasPlayed && result ? (
            <RetitleResult 
              result={result} 
              puzzleId={puzzle?.id || ""}
            />
          ) : puzzle ? (
            <RetitlePuzzle 
              puzzle={puzzle}
              onGuess={handleGuess}
              startTime={startTime}
            />
          ) : (
            <div className="text-center">
              <p>No puzzle available today. Please check back tomorrow!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}