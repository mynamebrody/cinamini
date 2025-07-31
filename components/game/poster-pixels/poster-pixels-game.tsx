"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Play, Clock, BarChart3, Loader2 } from "lucide-react"
import { GameHeader } from "../game-header"
import { HowToPlayModal } from "../how-to-play-modal"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import confetti from "canvas-confetti"
import PosterPixelsSearch from "./poster-pixels-search"
import PosterPixelsStats from "./poster-pixels-stats"
import PosterPixelsResult from "./poster-pixels-result"

interface MovieData {
  id?: number
  title?: string
  poster_path?: string
  release_date?: string
  overview?: string
}

interface PuzzleData {
  id: number
  puzzle_number?: number
  movie_data?: MovieData
  // New admin system fields
  film_id?: number
  film_title?: string
  film_poster_url?: string
  film_release_year?: number
}

interface GameState {
  puzzle: PuzzleData | null
  gameId: string | null
  hasPlayedToday: boolean
  gameStarted: boolean
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

type GameStateType = 'loading' | 'ready' | 'playing' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

const GAME_DURATION = 30 // seconds
const MAX_GUESSES = 1

export default function PosterPixelsGame() {
  const [gameState, setGameState] = useState<GameStateType>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [state, setState] = useState<GameState>({
    puzzle: null,
    gameId: null,
    hasPlayedToday: false,
    gameStarted: false,
    won: false,
    timeElapsed: 0,
    clarityLevel: 0.20, // Start at 20% clarity
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
    if (state.gameStarted && gameState === 'playing' && state.timeElapsed < GAME_DURATION) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const newTimeElapsed = prev.timeElapsed + 0.1
          const newClarityLevel = Math.min(1, 0.20 + (newTimeElapsed / GAME_DURATION) * 0.80)
          
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
  }, [state.gameStarted, gameState, state.timeElapsed])

  // Draw pixelated poster
  useEffect(() => {
    if (canvasRef.current && state.puzzle && state.gameStarted) {
      drawPixelatedPoster()
    }
  }, [state.clarityLevel, state.puzzle, state.gameStarted])

  const loadTodaysPuzzle = async () => {
    try {
      const response = await fetch("/api/poster-pixels/puzzle/today")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load puzzle")
      }

      setState(prev => ({
        ...prev,
        puzzle: data.puzzle,
        hasPlayedToday: data.hasPlayedToday,
        won: data.hasPlayedToday && data.previousGame?.won,
        timeElapsed: data.hasPlayedToday && data.previousGame?.total_time_ms 
          ? data.previousGame.total_time_ms / 1000 // Convert ms to seconds
          : prev.timeElapsed,
        clarityLevel: data.hasPlayedToday && data.previousGame?.final_clarity_level 
          ? data.previousGame.final_clarity_level
          : prev.clarityLevel,
        guesses: data.previousGame?.guesses || [],
      }))

      if (data.hasPlayedToday) {
        setGameState('completed')
      } else {
        // Check if this is the user's first time playing
        const hasPlayedBefore = localStorage.getItem('poster-pixels-played')
        setGameState('ready')
        if (!hasPlayedBefore) {
          setModalState('howtoplay')
        }
      }
    } catch (error) {
      console.error("Error loading puzzle:", error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load puzzle",
      }))
      setGameState('error')
    }
  }

  const startGame = async () => {
    // Mark that the user has played before if coming from how to play
    if (modalState === 'howtoplay') {
      localStorage.setItem('poster-pixels-played', 'true')
    }

    try {
      const response = await fetch("/api/poster-pixels/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle_id: state.puzzle!.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start game")
      }

      startTimeRef.current = Date.now()
      setState(prev => ({
        ...prev,
        gameId: data.gameId,
        gameStarted: true,
        timeElapsed: 0,
        clarityLevel: 0.20,
      }))
      setGameState('playing')
      setModalState('none')
    } catch (error) {
      console.error("Error starting game:", error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to start game",
      }))
      setGameState('error')
    }
  }

  const drawPixelatedPoster = () => {
    const canvas = canvasRef.current
    if (!canvas || !state.puzzle) return
    
    // Handle both old and new data structures
    const posterPath = state.puzzle.movie_data?.poster_path || state.puzzle.film_poster_url
    if (!posterPath) {
      console.error("No poster path found in puzzle data")
      return
    }
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    // Handle both full URLs and path-only formats
    img.src = posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`
    
    img.onload = () => {
      try {
        // Calculate pixelation based on clarity level
        const pixelSize = Math.max(1, Math.floor((1 - state.clarityLevel) * 50) + 1)
        
        // Set canvas size
        canvas.width = 300
        canvas.height = 450
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = false
        
        // Draw pixelated version
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        
        if (!tempCtx) {
          console.error("Failed to get 2D context for temporary canvas")
          return
        }
        
        // Calculate dimensions for pixelation
        const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize))
        const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize))
        
        tempCanvas.width = scaledWidth
        tempCanvas.height = scaledHeight
        
        // Draw small version
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
        
        // Draw scaled up version (pixelated)
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height)
      } catch (error) {
        console.error("Error drawing pixelated poster:", error)
      }
    }
    
    img.onerror = () => {
      console.error("Failed to load poster image:", img.src)
    }
  }

  const handleGuess = async () => {
    if (!selectedMovie || !state.gameId || gameState !== 'playing') return

    const timeTaken = Math.round(Date.now() - (startTimeRef.current || Date.now()))
    const guessClarityLevel = state.clarityLevel // Capture clarity level at guess time
    
    // Handle both old and new data structures
    const correctMovieId = state.puzzle!.movie_data?.id || state.puzzle!.film_id
    const isCorrect = selectedMovie.id === correctMovieId

    try {
      const response = await fetch("/api/poster-pixels/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: state.gameId,
          puzzle_id: state.puzzle!.id,
          guessed_movie_id: selectedMovie.id,
          guessed_movie_title: selectedMovie.title,
          time_taken_ms: timeTaken,
          clarity_level: guessClarityLevel,
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
        clarityLevel: guessClarityLevel,
      }

      setState(prev => ({
        ...prev,
        guesses: [...prev.guesses, newGuess],
      }))

      setSelectedMovie(null)

      // End game immediately after single guess
      handleGameOver(isCorrect, guessClarityLevel)
    } catch (error) {
      console.error("Error submitting guess:", error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to submit guess",
      }))
      setGameState('error')
    }
  }

  const handleGameOver = async (won: boolean, guessClarityLevel?: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Use the clarity level from the guess, or current clarity if no guess was made (time up)
    const finalClarityLevel = guessClarityLevel || state.clarityLevel

    try {
      await fetch("/api/poster-pixels/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: state.gameId,
          won,
          total_time_ms: Math.round(state.timeElapsed * 1000),
          final_clarity_level: finalClarityLevel,
        }),
      })
    } catch (error) {
      console.error("Error completing game:", error)
    }

    setState(prev => ({
      ...prev,
      won,
      clarityLevel: finalClarityLevel, // Preserve the clarity level from when guess was made
    }))
    setGameState('completed')

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
        title="Poster Pixels" 
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
        title="Poster Pixels"
        instructions={
          <div className="space-y-4">
            <p className="text-neutral-600">
              Can you identify the movie from its pixelated poster?
            </p>
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">How to Play:</h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• A pixelated movie poster will appear</li>
                <li>• It gradually becomes clearer over 30 seconds</li>
                <li>• You have one guess to identify the movie</li>
                <li>• The sooner you guess correctly, the better!</li>
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
          <PosterPixelsStats />
        </GameModalBody>
      </GameModal>

      <main className="flex-1 overflow-auto p-4">
        {gameState === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {gameState === 'error' && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <p className="text-red-500 mb-4">{state.error}</p>
                <Button onClick={() => window.location.reload()} className="w-full">
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
                <CardTitle>Poster Pixels</CardTitle>
                <p className="text-muted-foreground">
                  Identify the movie from its pixelated poster
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-lg text-neutral-700">
                    A pixelated movie poster will appear and gradually become clearer over 30 seconds.
                  </p>
                  <p className="text-neutral-600 mt-2">
                    You have one guess to identify the movie. The sooner you guess correctly, the better!
                  </p>
                </div>

                <Button
                  onClick={startGame}
                  size="lg"
                  variant="primary"
                  className="w-full"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Game
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Daily puzzle • {new Date().toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-white border-neutral-200">
              <div className="space-y-6">
                {/* Centered Timer */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 text-2xl font-bold text-white bg-neutral-800 px-4 py-2 rounded-lg">
                    <Clock className="w-6 h-6" />
                    <span>{formatTime(GAME_DURATION - state.timeElapsed)}</span>
                  </div>
                </div>

                {/* Poster Display */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="border-2 border-neutral-200 rounded-lg shadow-2xl"
                      width={300}
                      height={450}
                    />
                  </div>
                </div>

                {/* Search Bar */}
                <div className="space-y-4">
                  <PosterPixelsSearch
                    onMovieSelect={setSelectedMovie}
                    selectedMovie={selectedMovie}
                    disabled={false}
                  />
                  <Button
                    onClick={handleGuess}
                    disabled={!selectedMovie}
                    variant="primary"
                    className="w-full"
                  >
                    Submit Guess
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {gameState === 'completed' && state.puzzle && (
          <PosterPixelsResult
            puzzleNumber={state.puzzle.puzzle_number || 1}
            won={state.won}
            timeElapsed={state.timeElapsed}
            clarityLevel={state.clarityLevel}
            movieTitle={state.puzzle.movie_data?.title || state.puzzle.film_title || "Unknown Movie"}
            movieYear={
              state.puzzle.movie_data?.release_date ? 
                new Date(state.puzzle.movie_data.release_date).getFullYear().toString() :
              state.puzzle.film_release_year ?
                state.puzzle.film_release_year.toString() :
                "Unknown"
            }
            moviePosterUrl={
              state.puzzle.movie_data?.poster_path ? 
                `https://image.tmdb.org/t/p/w342${state.puzzle.movie_data.poster_path}` :
              state.puzzle.film_poster_url ?
                (state.puzzle.film_poster_url.startsWith('http') ? 
                  state.puzzle.film_poster_url : 
                  `https://image.tmdb.org/t/p/w342${state.puzzle.film_poster_url}`) :
                undefined
            }
            guesses={state.guesses}
          />
        )}
      </main>
    </div>
  )
}