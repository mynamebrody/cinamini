"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import RetitlePuzzle from "./retitle-puzzle"
import RetitleResult from "./retitle-result"
import RetitleStats from "./retitle-stats"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy } from "lucide-react"

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
        // Fetch the full result data
        const guessResponse = await fetch("/api/retitled/stats")
        if (guessResponse.ok) {
          const statsData = await guessResponse.json()
          setResult({
            correct: data.userGuess.isCorrect,
            correctAnswer: {
              id: data.puzzle.options.find((opt: any) => opt.id === data.userGuess.guessFilmId)?.id || 0,
              title: data.puzzle.options.find((opt: any) => opt.id === data.userGuess.guessFilmId)?.title || "",
              originalTitle: data.puzzle.options.find((opt: any) => opt.id === data.userGuess.guessFilmId)?.title || "",
              releaseYear: "1988", // Hardcoded for MVP
              translationNote: "The French title translates to 'Crystal Trap'"
            },
            stats: {
              gamesPlayed: statsData.stats.gamesPlayed,
              accuracy: statsData.stats.accuracy,
              currentStreak: statsData.stats.currentStreak
            }
          })
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
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161616]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#161616]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Button 
            onClick={() => router.push("/")}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-white">Retitle</h1>
          <Button
            onClick={() => setShowStats(!showStats)}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <Trophy className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
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
          <div className="text-center text-white">
            <p>No puzzle available today. Please check back tomorrow!</p>
          </div>
        )}
      </main>
    </div>
  )
}