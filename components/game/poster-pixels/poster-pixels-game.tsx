"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
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
import { MorePuzzlesSection } from "../more-puzzles-section"

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
  clarity_levels?: number[]
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
  currentLevelIndex: number
  finalScore?: number
}

type GameStateType = 'loading' | 'ready' | 'playing' | 'celebrating' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

const DEFAULT_LEVELS = [5, 15, 35, 65, 100]

export default function PosterPixelsGame() {
  const { isAnonymous, loading: authLoading } = useGameMode()
  const [gameState, setGameState] = useState<GameStateType>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [state, setState] = useState<GameState>({
    puzzle: null,
    gameId: null,
    hasPlayedToday: false,
    gameStarted: false,
    won: false,
    timeElapsed: 0,
    clarityLevel: 0.05,
    guesses: [],
    error: null,
    currentLevelIndex: 0,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedMovie, setSelectedMovie] = useState<{
    id: number
    title: string
  } | null>(null)

  // Load today's puzzle
  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])

  // Draw pixelated poster on clarity changes
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

  const getLevels = () => state.puzzle?.clarity_levels || DEFAULT_LEVELS
  const getLevelFraction = (index: number) => {
    const levels = getLevels()
    const clampedIndex = Math.max(0, Math.min(levels.length - 1, index))
    return (levels[clampedIndex] / 100)
  }

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

        const initialIndex = 0
        setState(prev => ({
          ...prev,
          puzzle: data.puzzle,
          hasPlayedToday: localResult !== null,
          won: localResult?.result?.won || false,
          timeElapsed: 0,
          clarityLevel: getLevelFraction(initialIndex),
          currentLevelIndex: initialIndex,
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

        const initialIndex = 0
        setState(prev => ({
          ...prev,
          puzzle: data.puzzle,
          hasPlayedToday: data.hasPlayedToday,
          won: data.hasPlayedToday && data.previousGame?.won,
          timeElapsed: 0,
          clarityLevel: getLevelFraction(initialIndex),
          currentLevelIndex: initialIndex,
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
    
    // Mark that the user has played before if coming from how to play
    if (modalState === 'howtoplay') {
      localStorage.setItem('poster-pixels-played', 'true')
    }
    

    try {
      if (isAnonymous) {
        // For anonymous users, handle game start locally
        setState(prev => ({
          ...prev,
          gameId: `anonymous-${Date.now()}`,
          gameStarted: true,
          timeElapsed: 0,
          clarityLevel: getLevelFraction(0),
          currentLevelIndex: 0,
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

        setState(prev => ({
          ...prev,
          gameId: data.gameId,
          gameStarted: true,
          timeElapsed: 0,
          clarityLevel: getLevelFraction(0),
          currentLevelIndex: 0,
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

  const enhancementsUsed = () => state.currentLevelIndex + 1

  const calculateScoreFromLevel = (index: number) => {
    const levels = getLevels()
    const level = levels[Math.max(0, Math.min(levels.length - 1, index))]
    if (level <= 5) return 1000
    if (level <= 15) return 750
    if (level <= 35) return 500
    if (level <= 65) return 250
    return 100
  }

  const handleGuess = async () => {
    if (!selectedMovie || !state.gameId || gameState !== 'playing') return

    const guessClarityLevel = state.clarityLevel // 0..1
    
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

        const updatedGuesses = [...state.guesses, newGuess]
        handleGameOver(isCorrect, guessClarityLevel, updatedGuesses)
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
            time_taken_ms: 0,
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

        const updatedGuesses = [...state.guesses, newGuess]
        handleGameOver(isCorrect, guessClarityLevel, updatedGuesses)
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

    const guessClarityLevel = state.clarityLevel // 0..1
    
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

        const updatedGuesses = [...state.guesses, newGuess]
        handleGameOver(isCorrect, guessClarityLevel, updatedGuesses)
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
            time_taken_ms: 0,
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

        const updatedGuesses = [...state.guesses, newGuess]
        handleGameOver(isCorrect, guessClarityLevel, updatedGuesses)
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

  const handleGameOver = async (won: boolean, guessClarityLevel?: number, updatedGuesses?: Array<{ movieId: number; movieTitle: string; isCorrect: boolean; clarityLevel: number }>) => {
    // Compute score from level index
    const score = calculateScoreFromLevel(state.currentLevelIndex)

    try {
      if (isAnonymous) {
        // Save result to local storage for anonymous users
        const anonymousResult = {
          won,
          timeElapsed: 0,
          clarityLevel: guessClarityLevel || state.clarityLevel,
          guesses: updatedGuesses || state.guesses,
          puzzleId: state.puzzle!.id,
          movieTitle: state.puzzle!.movie_data?.title || state.puzzle!.film_title,
          finalScore: score,
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
            total_time_ms: 0,
            final_clarity_level: guessClarityLevel || state.clarityLevel,
          }),
        })
      }
    } catch (error) {
      console.error("Error completing game:", error)
    }

    // Update final game state
    setState(prev => ({
      ...prev,
      won,
      clarityLevel: guessClarityLevel || state.clarityLevel,
      finalScore: score,
    }))
    setGameState('completed')

    if (won) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    } else {
    }
  }

  const enhance = () => {
    const levels = getLevels()
    setState(prev => {
      const nextIndex = Math.min(prev.currentLevelIndex + 1, levels.length - 1)
      return {
        ...prev,
        currentLevelIndex: nextIndex,
        clarityLevel: getLevelFraction(nextIndex),
      }
    })
  }

  const formatPercent = (fraction: number) => `${Math.round(fraction * 100)}%`

  // Don't render the game container UI if we're showing the landing page
  if (gameState === "ready" && modalState !== 'howtoplay') {
    return (
      <GameLanding
        gameId="poster-pixels"
        gameName="Poster Pixels"
        puzzleNumber={state.puzzle?.puzzle_number}
        puzzleDate={new Date().toISOString().split('T')[0]}
        backgroundColor="#3a3a3c"
        logo="/cinamini/games/PosterPixelsPoster.svg"
        logoPng="/cinamini/games/PosterPixelsPoster.png"
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
          <Button variant="ghost" size="sm" onClick={() => setModalState('stats')}>
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
              description="A heavily pixelated movie poster appears on screen. Click Enhance to reveal more details."
              darkTheme={true}
            />
            <InstructionCard
              step={2}
              title="Enhance in 5 Steps"
              description="Each click sharpens the poster. Fewer enhancements = higher score."
              darkTheme={true}
            />
            <InstructionCard
              step={3}
              title="Search & Guess"
              description="Search for movies and make your best guess. You only get one chance, so choose wisely!"
              darkTheme={true}
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
              description="The earlier you guess correctly, the higher your score!"
              darkTheme={true}
              example={
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-foreground text-sm font-semibold">🏆 Perfect!</div>
                  <div className="text-muted-foreground text-xs mt-1">Solved in 1 🔍</div>
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
                <p className="text-cinema-red mb-4 bg-white/50 rounded-lg p-3">
                  <span className="text-sm font-medium">Studio Issue:</span><br />
                  {state.error}
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-gradient-to-r from-red-500 to-cinema-red hover:from-cinema-red hover:to-red-700"
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
          <div className="max-w-4xl mx-auto space-y-6 pb-40">
            {/* Poster Display */}
            <div className="flex flex-col items-center gap-4">
              <canvas
                ref={canvasRef}
                className="border border-[rgb(var(--silver))] shadow-3d-grey"
                width={300}
                height={450}
                style={{ borderRadius: 0 }}
              />

              {/* Enhance controls */}
              <div className="flex items-center gap-3">
                <Button onClick={enhance} disabled={state.currentLevelIndex >= getLevels().length - 1}>
                  Enhance 🔍
                </Button>
                <div className="text-sm text-muted-foreground">
                  Level {state.currentLevelIndex + 1} of {getLevels().length} • {formatPercent(state.clarityLevel)}
                </div>
              </div>
            </div>

            {/* Search Card */}
            <Card className="border border-[rgb(var(--silver))] shadow-3d-grey mb-40" style={{ borderRadius: 0 }}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">Guess the Movie</h3>
                    <p className="text-sm text-muted-foreground mt-1">Search for the movie title</p>
                  </div>
                  
                  <PosterPixelsSearch
                    onMovieSelect={setSelectedMovie}
                    selectedMovie={selectedMovie}
                    disabled={false}
                    onAutoSubmit={handleAutoSubmit}
                  />
                  
                  {selectedMovie && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={handleGuess}
                        size="lg"
                        className="px-8 py-3"
                      >
                        Submit Guess
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'completed' && state.puzzle && (
          <PosterPixelsResult
            puzzleId={String(state.puzzle.id)}
            puzzleNumber={state.puzzle.puzzle_number || 1}
            won={state.won}
            timeElapsed={0}
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
            finalScore={state.finalScore || 0}
          />
        )}
        
        {gameState === 'completed' && (
          <div className="max-w-md mx-auto mt-6">
            {/* More Puzzles Section */}
            <MorePuzzlesSection currentGameId="poster-pixels" />
          </div>
        )}
      </main>
    </div>
  )
}