"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Play, Clock } from "lucide-react"
import confetti from "canvas-confetti"
import PosterPixelsSearch from "./poster-pixels-search"
import { useRouter } from "next/navigation"

interface MovieData {
  id: number
  title: string
  poster_path: string
  release_date: string
  overview: string
}

interface PuzzleData {
  id: number
  movie_data: MovieData
}

interface GameState {
  puzzle: PuzzleData | null
  gameId: string | null
  isLoading: boolean
  hasPlayedToday: boolean
  gameStarted: boolean
  gameCompleted: boolean
  won: boolean
  timeElapsed: number
  clarityLevel: number
  guesses: Array<{
    movieId: number
    movieTitle: string
    isCorrect: boolean
    clarityLevel: number
  }>
  error: string | null
}

const GAME_DURATION = 30 // seconds
const MAX_GUESSES = 6

export default function PosterPixelsGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>({
    puzzle: null,
    gameId: null,
    isLoading: true,
    hasPlayedToday: false,
    gameStarted: false,
    gameCompleted: false,
    won: false,
    timeElapsed: 0,
    clarityLevel: 0.05, // Start at 5% clarity
    guesses: [],
    error: null,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedMovie, setSelectedMovie] = useState<{
    id: number
    title: string
  } | null>(null)

  // Load today's puzzle
  useEffect(() => {
    loadTodaysPuzzle()
  }, [])

  // Timer effect
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameCompleted && gameState.timeElapsed < GAME_DURATION) {
      intervalRef.current = setInterval(() => {
        setGameState(prev => {
          const newTimeElapsed = prev.timeElapsed + 0.1
          const newClarityLevel = Math.min(1, 0.05 + (newTimeElapsed / GAME_DURATION) * 0.95)
          
          // Check if time is up
          if (newTimeElapsed >= GAME_DURATION) {
            handleGameOver(false)
            return prev
          }
          
          return {
            ...prev,
            timeElapsed: newTimeElapsed,
            clarityLevel: newClarityLevel,
          }
        })
      }, 100) // Update every 100ms for smooth animation

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [gameState.gameStarted, gameState.gameCompleted, gameState.timeElapsed])

  // Draw pixelated poster
  useEffect(() => {
    if (canvasRef.current && gameState.puzzle && gameState.gameStarted) {
      drawPixelatedPoster()
    }
  }, [gameState.clarityLevel, gameState.puzzle, gameState.gameStarted])

  const loadTodaysPuzzle = async () => {
    try {
      const response = await fetch("/api/poster-pixels/puzzle/today")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load puzzle")
      }

      setGameState(prev => ({
        ...prev,
        puzzle: data.puzzle,
        hasPlayedToday: data.hasPlayedToday,
        isLoading: false,
        won: data.hasPlayedToday && data.previousGame?.won,
        gameCompleted: data.hasPlayedToday,
        guesses: data.previousGame?.guesses || [],
      }))
    } catch (error) {
      console.error("Error loading puzzle:", error)
      setGameState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load puzzle",
        isLoading: false,
      }))
    }
  }

  const startGame = async () => {
    try {
      const response = await fetch("/api/poster-pixels/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle_id: gameState.puzzle!.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start game")
      }

      startTimeRef.current = Date.now()
      setGameState(prev => ({
        ...prev,
        gameId: data.gameId,
        gameStarted: true,
        timeElapsed: 0,
        clarityLevel: 0.05,
      }))
    } catch (error) {
      console.error("Error starting game:", error)
      setGameState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to start game",
      }))
    }
  }

  const drawPixelatedPoster = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !gameState.puzzle) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = `https://image.tmdb.org/t/p/w500${gameState.puzzle.movie_data.poster_path}`
    
    img.onload = () => {
      // Calculate pixelation based on clarity level
      const pixelSize = Math.max(1, Math.floor((1 - gameState.clarityLevel) * 50) + 1)
      
      // Set canvas size
      canvas.width = 300
      canvas.height = 450
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = false
      
      // Draw pixelated version
      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d")!
      
      // Calculate dimensions for pixelation
      const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize))
      const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize))
      
      tempCanvas.width = scaledWidth
      tempCanvas.height = scaledHeight
      
      // Draw small version
      tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
      
      // Draw scaled up version (pixelated)
      ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height)
    }
  }

  const handleGuess = async () => {
    if (!selectedMovie || !gameState.gameId || gameState.gameCompleted) return

    const timeTaken = Date.now() - (startTimeRef.current || Date.now())
    const isCorrect = selectedMovie.id === gameState.puzzle!.movie_data.id

    try {
      const response = await fetch("/api/poster-pixels/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameState.gameId,
          puzzle_id: gameState.puzzle!.id,
          guessed_movie_id: selectedMovie.id,
          guessed_movie_title: selectedMovie.title,
          time_taken_ms: timeTaken,
          clarity_level: gameState.clarityLevel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit guess")
      }

      const newGuess = {
        movieId: selectedMovie.id,
        movieTitle: selectedMovie.title,
        isCorrect,
        clarityLevel: gameState.clarityLevel,
      }

      setGameState(prev => ({
        ...prev,
        guesses: [...prev.guesses, newGuess],
      }))

      setSelectedMovie(null)

      if (isCorrect) {
        handleGameOver(true)
      } else if (gameState.guesses.length + 1 >= MAX_GUESSES) {
        handleGameOver(false)
      }
    } catch (error) {
      console.error("Error submitting guess:", error)
      setGameState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to submit guess",
      }))
    }
  }

  const handleGameOver = async (won: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    try {
      await fetch("/api/poster-pixels/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameState.gameId,
          won,
          total_time_ms: gameState.timeElapsed * 1000,
          final_clarity_level: gameState.clarityLevel,
        }),
      })
    } catch (error) {
      console.error("Error completing game:", error)
    }

    setGameState(prev => ({
      ...prev,
      gameCompleted: true,
      won,
      clarityLevel: 1, // Show full clarity at the end
    }))

    if (won) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }

  const formatTime = (seconds: number) => {
    const secs = Math.floor(seconds)
    return `${secs}s`
  }

  const getClarityPercentage = () => {
    return Math.round(gameState.clarityLevel * 100)
  }

  if (gameState.isLoading) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (gameState.error) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <Card className="p-6 bg-red-500/10 border-red-500/20">
          <p className="text-red-400">{gameState.error}</p>
          <Button
            onClick={() => router.push("/")}
            className="mt-4 bg-white/10 hover:bg-white/20"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161616] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Poster Pixels</h1>
          <p className="text-gray-400">
            Guess the movie as the poster becomes clearer!
          </p>
        </div>

        {/* Game Content */}
        <Card className="p-8 bg-[#1a1a1a] border-white/10">
          {!gameState.gameStarted && !gameState.hasPlayedToday ? (
            // Start Screen
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <p className="text-lg text-gray-300">
                  A pixelated movie poster will appear and gradually become clearer over 30 seconds.
                </p>
                <p className="text-gray-400">
                  You have {MAX_GUESSES} guesses to identify the movie. The sooner you guess correctly, the better!
                </p>
              </div>
              <Button
                onClick={startGame}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </Button>
            </div>
          ) : (
            // Game Screen
            <div className="space-y-6">
              {/* Game Stats */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(GAME_DURATION - gameState.timeElapsed)}</span>
                  </div>
                  <div className="text-gray-400">
                    Clarity: {getClarityPercentage()}%
                  </div>
                </div>
                <div className="text-gray-400">
                  Guesses: {gameState.guesses.length}/{MAX_GUESSES}
                </div>
              </div>

              {/* Poster Display */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="border-2 border-white/10 rounded-lg shadow-2xl"
                    width={300}
                    height={450}
                  />
                  {gameState.gameCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {gameState.won ? "Correct!" : "Game Over"}
                        </h3>
                        <p className="text-lg text-gray-300">
                          {gameState.puzzle?.movie_data.title}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Guesses List */}
              {gameState.guesses.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="text-sm font-medium text-gray-400">Your Guesses:</h3>
                  {gameState.guesses.map((guess, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg text-sm ${
                        guess.isCorrect
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {guess.movieTitle} (at {Math.round(guess.clarityLevel * 100)}% clarity)
                    </div>
                  ))}
                </div>
              )}

              {/* Search Bar */}
              {!gameState.gameCompleted && gameState.gameStarted && (
                <div className="space-y-4">
                  <PosterPixelsSearch
                    onMovieSelect={setSelectedMovie}
                    selectedMovie={selectedMovie}
                    disabled={gameState.gameCompleted}
                  />
                  <Button
                    onClick={handleGuess}
                    disabled={!selectedMovie || gameState.gameCompleted}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Submit Guess
                  </Button>
                </div>
              )}

              {/* Completion Actions */}
              {gameState.gameCompleted && (
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="border-white/20 hover:bg-white/10"
                  >
                    Back to Home
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}