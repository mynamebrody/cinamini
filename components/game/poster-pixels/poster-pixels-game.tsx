"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, BarChart3, Loader2 } from "lucide-react"
import { GameHeader } from "../game-header"
import { GameLanding } from "../game-landing"
import { InstructionCard, InstructionGrid } from "../instruction-card"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import confetti from "canvas-confetti"
import { useGameMode } from "@/hooks/use-game-mode"
import { localGameStorage } from "@/lib/local-game-storage"
import PosterPixelsSearch from "./poster-pixels-search"
import PosterPixelsStats from "./poster-pixels-stats"
import PosterPixelsResult from "./poster-pixels-result"
import { PosterPixelsClarityProgress } from "./poster-pixels-clarity-progress"
import { PosterPixelsArtGalleryCelebration } from "./poster-pixels-art-gallery-celebration"
import { usePosterPixelsSounds } from "./poster-pixels-sound-effects"

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

type GameStateType = 'loading' | 'ready' | 'playing' | 'celebrating' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

const GAME_DURATION = 30 // seconds

export default function PosterPixelsGame() {
  const { isAnonymous, loading: authLoading } = useGameMode()
  const sounds = usePosterPixelsSounds()
  const [gameState, setGameState] = useState<GameStateType>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [state, setState] = useState<GameState>({
    puzzle: null,
    gameId: null,
    hasPlayedToday: false,
    gameStarted: false,
    won: false,
    timeElapsed: 0,
    clarityLevel: 0.50, // Start at 50% clarity
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
  const [celebrationData, setCelebrationData] = useState<{
    won: boolean
    clarityLevel: number
    movieTitle: string
  } | null>(null)

  // Load today's puzzle
  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])

  // Timer effect
  useEffect(() => {
    if (state.gameStarted && gameState === 'playing' && state.timeElapsed < GAME_DURATION) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const newTimeElapsed = prev.timeElapsed + 0.1
          // Reach 100% clarity at 25 seconds (5 seconds before the end)
          const TARGET_TIME = 25 // Time to reach 100% clarity
          const newClarityLevel = Math.min(1, 0.50 + (Math.min(newTimeElapsed, TARGET_TIME) / TARGET_TIME) * 0.50)
          
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
      try {
        drawPixelatedPoster()
      } catch (error) {
        console.error("Error calling drawPixelatedPoster:", error)
        // Set error state if drawing fails consistently
        setState(prev => ({
          ...prev,
          error: "Failed to load poster image. Please try again."
        }))
      }
    }
  }, [state.clarityLevel, state.puzzle, state.gameStarted])

  const loadTodaysPuzzle = async () => {
    try {
      if (isAnonymous) {
        // For anonymous users, check local storage for today's game
        const localResult = localGameStorage.getTodayResult('poster-pixels')
        
        // Still need to fetch the puzzle data from the API
        const response = await fetch("/api/poster-pixels/puzzle/today")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to load puzzle")
        }

        setState(prev => ({
          ...prev,
          puzzle: data.puzzle,
          hasPlayedToday: localResult !== null,
          won: localResult?.result?.won || false,
          timeElapsed: localResult?.result?.timeElapsed || 0,
          clarityLevel: localResult?.result?.clarityLevel || 0.75,
          guesses: localResult?.result?.guesses || [],
        }))

        if (localResult) {
          setGameState('completed')
        } else {
          // Check if this is the user's first time playing
          const hasPlayedBefore = localStorage.getItem('poster-pixels-played')
          setGameState('ready')
          if (!hasPlayedBefore) {
            setModalState('howtoplay')
          }
        }
      } else {
        // Authenticated user - use existing API logic
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
    // Initialize sound system on first interaction
    sounds.initialize()
    
    // Mark that the user has played before if coming from how to play
    if (modalState === 'howtoplay') {
      localStorage.setItem('poster-pixels-played', 'true')
    }
    
    // Play camera shutter sound for game start
    sounds.playShutter()

    try {
      if (isAnonymous) {
        // For anonymous users, handle game start locally
        startTimeRef.current = Date.now()
        setState(prev => ({
          ...prev,
          gameId: `anonymous-${Date.now()}`, // Generate local game ID
          gameStarted: true,
          timeElapsed: 0,
          clarityLevel: 0.20,
        }))
        setGameState('playing')
      } else {
        // Authenticated user - use API
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
      }
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
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Handle both old and new data structures
    const posterPath = state.puzzle.movie_data?.poster_path || state.puzzle.film_poster_url
    if (!posterPath) {
      console.error("No poster path found in puzzle data")
      drawFallbackPoster(ctx, canvas)
      return
    }

    try {

    const img = new Image()
    img.crossOrigin = "anonymous"
    // Handle both full URLs and path-only formats
    const imageUrl = posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`
    img.src = imageUrl
    
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
        // Draw a fallback placeholder
        drawFallbackPoster(ctx, canvas)
      }
    }
    
    img.onerror = (error) => {
      console.error("Failed to load poster image:", error)
      // Draw a fallback placeholder instead of throwing an error
      drawFallbackPoster(ctx, canvas)
    }
    } catch (error) {
      console.error("Error in drawPixelatedPoster:", error)
      // Draw fallback if any error occurs
      drawFallbackPoster(ctx, canvas)
    }
  }
  
  const drawFallbackPoster = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Set canvas size
    canvas.width = 300
    canvas.height = 450
    
    // Draw a gray placeholder with text
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw border
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
    
    // Draw text
    ctx.fillStyle = '#6b7280'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Poster Loading...', canvas.width / 2, canvas.height / 2)
    ctx.fillText('Please check your connection', canvas.width / 2, canvas.height / 2 + 25)
  }

  const handleGuess = async () => {
    if (!selectedMovie || !state.gameId || gameState !== 'playing') return

    const timeTaken = Math.round(Date.now() - (startTimeRef.current || Date.now()))
    const guessClarityLevel = state.clarityLevel // Capture clarity level at guess time
    
    // Handle both old and new data structures
    const correctMovieId = state.puzzle!.movie_data?.id || state.puzzle!.film_id
    const isCorrect = selectedMovie.id === correctMovieId

    try {
      if (isAnonymous) {
        // Handle guess locally for anonymous users
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
      } else {
        // Authenticated user - use API
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
      }
    } catch (error) {
      console.error("Error submitting guess:", error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to submit guess",
      }))
      setGameState('error')
    }
  }

  const handleAutoSubmit = async (movie: { id: number; title: string }) => {
    if (!state.gameId || gameState !== 'playing') return

    const timeTaken = Math.round(Date.now() - (startTimeRef.current || Date.now()))
    const guessClarityLevel = state.clarityLevel // Capture clarity level at guess time
    
    // Handle both old and new data structures
    const correctMovieId = state.puzzle!.movie_data?.id || state.puzzle!.film_id
    const isCorrect = movie.id === correctMovieId

    try {
      if (isAnonymous) {
        // Handle auto-submit locally for anonymous users
        const newGuess = {
          movieId: movie.id,
          movieTitle: movie.title,
          isCorrect,
          clarityLevel: guessClarityLevel,
        }

        setState(prev => ({
          ...prev,
          guesses: [...prev.guesses, newGuess],
        }))

        // End game immediately after single guess
        handleGameOver(isCorrect, guessClarityLevel)
      } else {
        // Authenticated user - use API
        const response = await fetch("/api/poster-pixels/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: state.gameId,
            puzzle_id: state.puzzle!.id,
            guessed_movie_id: movie.id,
            guessed_movie_title: movie.title,
            time_taken_ms: timeTaken,
            clarity_level: guessClarityLevel,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit guess")
        }

        const newGuess = {
          movieId: movie.id,
          movieTitle: movie.title,
          isCorrect,
          clarityLevel: guessClarityLevel,
        }

        setState(prev => ({
          ...prev,
          guesses: [...prev.guesses, newGuess],
        }))

        // End game immediately after single guess
        handleGameOver(isCorrect, guessClarityLevel)
      }
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
      if (isAnonymous) {
        // Save result to local storage for anonymous users
        const anonymousResult = {
          won,
          timeElapsed: state.timeElapsed,
          clarityLevel: finalClarityLevel,
          guesses: state.guesses,
          puzzleId: state.puzzle!.id,
          movieTitle: state.puzzle!.movie_data?.title || state.puzzle!.film_title,
        }
        
        localGameStorage.saveDailyResult('poster-pixels', anonymousResult)
      } else {
        // Authenticated user - use API
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
      }
    } catch (error) {
      console.error("Error completing game:", error)
    }

    // Show celebration first, then transition to completed
    const movieTitle = state.puzzle!.movie_data?.title || state.puzzle!.film_title || "Unknown Movie"
    setCelebrationData({
      won,
      clarityLevel: finalClarityLevel,
      movieTitle
    })
    setGameState('celebrating')

    // Still fire confetti for wins and play celebration sound
    if (won) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
      sounds.playApplause()
    } else {
      // Play a gentle chime even for incorrect guesses to soften the blow
      sounds.playChime()
    }
  }

  const formatTime = (seconds: number) => {
    const secs = Math.floor(seconds)
    return `${secs}s`
  }

  const showStats = () => {
    setModalState('stats')
  }

  const handleCelebrationComplete = () => {
    // Update final game state after celebration
    setState(prev => ({
      ...prev,
      won: celebrationData?.won || false,
      clarityLevel: celebrationData?.clarityLevel || prev.clarityLevel,
    }))
    setGameState('completed')
    setCelebrationData(null)
  }


  // Don't render the game container UI if we're showing the landing page
  if (gameState === "ready" && modalState !== 'howtoplay') {
    return (
      <GameLanding
        gameId="poster-pixels"
        gameName="Poster Pixels"
        puzzleNumber={state.puzzle?.puzzle_number}
        puzzleDate={new Date().toISOString().split('T')[0]}
        backgroundColor="#3a3a3c"
        emoji="🖼️"
        onStart={startGame}
      >
        {/* How to Play content removed from splash page */}
      </GameLanding>
    )
  }

  // Render the game
  return (
    <div className="game-container">
      <GameHeader 
        title="Poster Pixels" 
        onHelpClick={() => setModalState('howtoplay')}
      >
        {(gameState === 'completed') && !isAnonymous && (
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
      >
        <GameModalHeader>
          <GameModalTitle>How to Play Poster Pixels</GameModalTitle>
        </GameModalHeader>
        <GameModalBody>
          <InstructionGrid columns={2}>
            <InstructionCard
              step={1}
              title="Blurry Movie Poster"
              description="A heavily pixelated movie poster appears on screen. At first, it's almost impossible to make out any details."
              example={
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="w-16 h-24 mx-auto bg-muted-foreground/40 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                    <div className="text-muted-foreground text-xs">Very Blurry</div>
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={2}
              title="Gradual Clarity"
              description="Over 30 seconds, the poster slowly becomes clearer and more recognizable. Details start to emerge."
              example={
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="w-16 h-24 mx-auto bg-muted-foreground/50 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                    <div className="text-foreground text-xs">Getting Clearer</div>
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={3}
              title="Search & Guess"
              description="Search for movies and make your best guess. You only get one chance, so choose wisely!"
              example={
                <div className="bg-muted rounded-lg px-3 py-2 text-center">
                  <div className="text-foreground text-sm">🔍 Search movies...</div>
                  <div className="mt-1 text-muted-foreground text-xs">One guess only!</div>
                </div>
              }
            />
            <InstructionCard
              step={4}
              title="Score Points"
              description="The earlier you guess correctly, the higher your score! Challenge yourself to identify movies from minimal details."
              example={
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-foreground text-sm font-semibold">🏆 Perfect!</div>
                  <div className="text-muted-foreground text-xs mt-1">Guessed at 45% clarity</div>
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
          <PosterPixelsStats />
        </GameModalBody>
      </GameModal>

      <main className="flex-1 overflow-auto p-4">
        {gameState === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg">Loading today's puzzle...</div>
            </div>
          </div>
        )}

        {gameState === 'error' && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="text-6xl mb-4">🖼️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Restoration Studio Error</h3>
                <p className="text-red-600 mb-4 bg-white/50 rounded-lg p-3">
                  <span className="text-sm font-medium">Studio Issue:</span><br />
                  {state.error}
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  <span className="mr-2">🔄</span>
                  Restart Restoration Studio
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Our art restoration tools need a moment to recalibrate
                </p>
              </CardContent>
            </Card>
          </div>
        )}


        {gameState === 'playing' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Art Restoration Studio Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 text-3xl font-bold text-white bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 rounded-2xl shadow-lg">
                <span className="text-2xl">🎨</span>
                <span>Restoration in Progress</span>
                <span className="text-2xl">🖼️</span>
              </div>
              <p className="mt-2 text-gray-600">Carefully reveal the hidden cinematic masterpiece</p>
            </div>

            {/* Clarity Progress Component - The Centerpiece */}
            <PosterPixelsClarityProgress
              clarityLevel={state.clarityLevel}
              timeElapsed={state.timeElapsed}
              totalTime={GAME_DURATION}
              isPlaying={true}
            />

            {/* Main Game Area */}
            <Card className="p-8 bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-2xl">
              <div className="space-y-6">
                {/* Timer with Art Theme */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-3 text-xl font-bold text-white bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-3 rounded-2xl shadow-lg border-2 border-gray-600">
                    <Clock className="w-5 h-5" />
                    <span>Time Remaining: {formatTime(GAME_DURATION - state.timeElapsed)}</span>
                    <span className="text-lg">⏱️</span>
                  </div>
                </div>

                {/* Poster Display with Art Gallery Frame */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    {/* Ornate Gallery Frame */}
                    <div className="absolute -inset-4 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 rounded-2xl shadow-2xl">
                      <div className="absolute inset-2 bg-gradient-to-br from-amber-200 to-amber-100 rounded-xl">
                        <div className="absolute inset-2 bg-white rounded-lg shadow-inner"></div>
                      </div>
                      {/* Frame decorations */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-600 rounded-full"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-600 rounded-full"></div>
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-amber-600 rounded-full"></div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-600 rounded-full"></div>
                    </div>
                    
                    {/* Spotlight Effect */}
                    <div className="absolute -inset-8 bg-gradient-radial from-yellow-200/20 via-transparent to-transparent rounded-full animate-pulse"></div>
                    
                    <canvas
                      ref={canvasRef}
                      className="relative z-10 border-4 border-white rounded-lg shadow-2xl cursor-crosshair hover:cursor-zoom-in transition-all duration-300"
                      width={300}
                      height={450}
                      title="Poster restoration in progress - revealing details..."
                    />
                    
                    {/* Restoration Tools Floating Around */}
                    <div className="absolute -right-12 top-8 text-2xl animate-bounce" style={{ animationDelay: '0s' }}>🔍</div>
                    <div className="absolute -left-12 top-16 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>🖌️</div>
                    <div className="absolute -right-8 bottom-12 text-2xl animate-bounce" style={{ animationDelay: '1s' }}>✨</div>
                  </div>
                </div>

                {/* Search Bar with Artist Theme */}
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
                      <span>🔍</span>
                      <span>Identify the Masterpiece</span>
                      <span>🎬</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Search for the movie title and make your expert assessment</p>
                  </div>
                  
                  <PosterPixelsSearch
                    onMovieSelect={setSelectedMovie}
                    selectedMovie={selectedMovie}
                    disabled={false}
                    onAutoSubmit={handleAutoSubmit}
                  />
                  
                  {/* Guess Button with Art Theme */}
                  {selectedMovie && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={handleGuess}
                        onMouseEnter={() => sounds.playInspection()}
                        size="lg"
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-2xl shadow-lg border-2 border-purple-500 transform hover:scale-105 transition-all duration-200 hover:shadow-2xl hover:shadow-purple-500/25 active:scale-95"
                      >
                        <span className="mr-2">🎨</span>
                        Complete Restoration
                        <span className="ml-2">✨</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Art Gallery Celebration */}
        {gameState === 'celebrating' && celebrationData && (
          <PosterPixelsArtGalleryCelebration
            isVisible={true}
            won={celebrationData.won}
            clarityLevel={celebrationData.clarityLevel}
            movieTitle={celebrationData.movieTitle}
            onComplete={handleCelebrationComplete}
          />
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