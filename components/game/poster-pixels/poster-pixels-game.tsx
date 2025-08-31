"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { GameLanding } from "../game-landing"
import { InstructionCard, InstructionGrid } from "../instruction-card"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import confetti from "canvas-confetti"
import { useGameMode } from "@/hooks/use-game-mode"
import { hasTutorialBeenViewed, setTutorialViewed } from "@/lib/game-tutorial-cookies"
import AnonymousResultNudge from "../anonymous-result-nudge"
import PosterPixelsSearch from "./poster-pixels-search"
import PosterPixelsStats from "./poster-pixels-stats"
import PosterPixelsResult from "./poster-pixels-result"
import { MorePuzzlesSection } from "../more-puzzles-section"
import { SiteFooter } from "../../site-footer"
import { POSTER_PIXELS_LEVELS, getClarityPercentForIndex, getScoreForClarityPercent } from "@/lib/poster-pixels-config"
import { useAnimatedClarity, easingFunctions } from "@/hooks/use-animated-clarity"
import { useFinalRevealAnimation } from "@/hooks/use-final-reveal-animation"

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

interface GuessEntry {
  movieId: number | null
  movieTitle: string
  isCorrect: boolean
  clarityLevel: number
}

interface GameState {
  puzzle: PuzzleData | null
  gameId: string | null
  hasPlayedToday: boolean
  gameStarted: boolean
  won: boolean
  timeElapsed: number
  clarityLevel: number
  guesses: GuessEntry[]
  error: string | null
  currentLevelIndex: number
  finalScore?: number
}

type GameStateType = 'loading' | 'ready' | 'playing' | 'celebrating' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

interface PosterPixelsGameProps {
  date?: string
}

export default function PosterPixelsGame({ date }: PosterPixelsGameProps = {}) {
  const { isAnonymous, loading: authLoading } = useGameMode()
  const [gameState, setGameState] = useState<GameStateType>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [totalGameTime, setTotalGameTime] = useState<number>(0)
  const [state, setState] = useState<GameState>({
    puzzle: null,
    gameId: null,
    hasPlayedToday: false,
    gameStarted: false,
    won: false,
    timeElapsed: 0,
    clarityLevel: getClarityPercentForIndex(0),
    guesses: [],
    error: null,
    currentLevelIndex: 0,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRevealing, setIsRevealing] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isProcessingGuess, setIsProcessingGuess] = useState(false)
  const { animatedClarity, isAnimating } = useAnimatedClarity(state.clarityLevel, {
    duration: state.won && state.clarityLevel === 100 ? 1500 : 800, // Longer animation for winning reveal
    easing: easingFunctions.easeInOutCubic
  })
  const { revealClarity, isAnimating: isRevealAnimating } = useFinalRevealAnimation(
    90, // Start from 90% clarity
    isRevealing,
    {
      duration: 2000, // 2 seconds for the final reveal
      onComplete: () => {
        // Ensure the game state is properly updated after reveal
        setIsRevealing(false)
      }
    }
  )

  // Load today's puzzle function (moved before useEffect to fix initialization)
  const loadTodaysPuzzle = useCallback(async () => {
    try {
      // Load puzzle (works for both anonymous and authenticated users)
      const endpoint = date ? `/api/poster-pixels/puzzle/by-date?date=${date}` : "/api/poster-pixels/puzzle/today"
      const response = await fetch(endpoint)
      const data = await response.json()

      if (!response.ok) {
        // If it's a 404 for a historical puzzle, redirect to today's puzzle
        if (response.status === 404 && date) {
          console.log("Historical puzzle not found, redirecting to today's puzzle")
          window.location.href = '/game/poster-pixels'
          return
        }
        throw new Error(data.error || "Failed to load puzzle")
      }

      const initialIndex = 0
      const wonFromDb = !!(data.hasPlayedToday && data.previousGame?.won)
      const clarityFromDb = data.previousGame?.final_clarity_level ?? getClarityPercentForIndex(initialIndex)
      const timeFromDb = data.previousGame?.total_time_ms ?? 0
      const guessesFromDb = data.previousGame?.guesses || []
      const scoreFromDb = wonFromDb ? getScoreForClarityPercent(Math.round(clarityFromDb)) : 0

      setState(prev => ({
        ...prev,
        puzzle: data.puzzle,
        hasPlayedToday: data.hasPlayedToday,
        won: wonFromDb,
        timeElapsed: timeFromDb,
        clarityLevel: clarityFromDb,
        currentLevelIndex: initialIndex,
        guesses: guessesFromDb,
        finalScore: scoreFromDb,
      }))

      if (data.hasPlayedToday) {
        // Set the total game time for display
        setTotalGameTime(Math.floor((data.previousGame?.totalTimeMs || 0) / 1000))
        setGameState('completed')
        setShowResults(true) // Show results immediately for completed games
        
        // Trigger celebration confetti if they won
        if (data.previousGame?.won) {
          setTimeout(() => {
            confetti({ 
              particleCount: 150, 
              spread: 70, 
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1']
            })
            
            // Add more confetti bursts
            setTimeout(() => {
              confetti({ 
                particleCount: 100, 
                spread: 60, 
                origin: { y: 0.7, x: 0.3 }
              })
            }, 200)
            
            setTimeout(() => {
              confetti({ 
                particleCount: 100, 
                spread: 60, 
                origin: { y: 0.7, x: 0.7 }
              })
            }, 400)
          }, 500)
        }
      } else {
        setGameState('ready')
        
        // Show how-to-play modal only if they've never seen the tutorial
        const hasSeenTutorial = hasTutorialBeenViewed('poster-pixels')
        if (!hasSeenTutorial) {
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
  }, [date])

  // Load today's puzzle
  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading, loadTodaysPuzzle])

  // Update total game time
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameStartTime > 0 && gameState === 'playing') {
        setTotalGameTime(Math.floor((Date.now() - gameStartTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStartTime, gameState])

  const drawFallbackPoster = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    canvas.width = 300
    canvas.height = 450
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
    ctx.fillStyle = '#6b7280'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Poster Loading...', canvas.width / 2, canvas.height / 2)
    ctx.fillText('Please check your connection', canvas.width / 2, canvas.height / 2 + 25)
  }, [])

  const drawPixelatedPoster = useCallback((clarityValue: number) => {
    const canvas = canvasRef.current
    if (!canvas || !state.puzzle) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const posterPath = state.puzzle.movie_data?.poster_path || state.puzzle.film_poster_url
    if (!posterPath) {
      console.error("No poster path found in puzzle data")
      drawFallbackPoster(ctx, canvas)
      return
    }

    try {
    const img = new Image()
    img.crossOrigin = "anonymous"
    const imageUrl = posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`
    img.src = imageUrl
    
    img.onload = () => {
      try {
        const pixelSize = Math.max(1, Math.floor((1 - clarityValue / 100) * 50) + 1)
        canvas.width = 300
        canvas.height = 450
        ctx.imageSmoothingEnabled = false
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) {
          console.error("Failed to get 2D context for temporary canvas")
          return
        }
        const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize))
        const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize))
        tempCanvas.width = scaledWidth
        tempCanvas.height = scaledHeight
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height)
      } catch (error) {
        console.error("Error drawing pixelated poster:", error)
        drawFallbackPoster(ctx, canvas)
      }
    }
    
    img.onerror = (error) => {
      console.error("Failed to load poster image:", error)
      drawFallbackPoster(ctx, canvas)
    }
    } catch (error) {
      console.error("Error in drawPixelatedPoster:", error)
      drawFallbackPoster(ctx, canvas)
    }
  }, [state.puzzle, drawFallbackPoster])

  // Draw pixelated poster on clarity changes
  useEffect(() => {
    if (canvasRef.current && state.puzzle && state.gameStarted) {
      try {
        // Use reveal clarity if revealing, otherwise use animated clarity
        const clarityToUse = isRevealing ? revealClarity : animatedClarity
        drawPixelatedPoster(clarityToUse)
      } catch (error) {
        console.error("Error calling drawPixelatedPoster:", error)
        setState(prev => ({
          ...prev,
          error: "Failed to load poster image. Please try again."
        }))
      }
    }
  }, [animatedClarity, revealClarity, isRevealing, state.puzzle, state.gameStarted, drawPixelatedPoster])

  const getLevels = () => Array.from(POSTER_PIXELS_LEVELS) // Always use config levels


  const calculateScoreForCurrent = () => {
    const percent = Math.round(state.clarityLevel)
    return getScoreForClarityPercent(percent)
  }

  const advanceLevelOrEnd = (won: boolean, updatedGuesses?: GuessEntry[]) => {
    const levels = getLevels()
    const isLast = state.currentLevelIndex >= levels.length - 1
    if (won) {
      endGame(true, updatedGuesses)
      return
    }
    if (isLast) {
      endGame(false, updatedGuesses)
    } else {
      const nextIndex = state.currentLevelIndex + 1
      const nextClarity = getClarityPercentForIndex(nextIndex)
      setState(prev => ({
        ...prev,
        currentLevelIndex: nextIndex,
        clarityLevel: nextClarity,
      }))
    }
  }

  const recordGuess = async (entry: GuessEntry): Promise<GuessEntry[]> => {
    const newGuesses = [...state.guesses, entry]
    setState(prev => ({ ...prev, guesses: newGuesses }))
    
    // Always set processing state to prevent button spamming
    setIsProcessingGuess(true)
    
    try {
      if (state.gameId && state.puzzle) {
        await fetch("/api/poster-pixels/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: state.gameId,
            puzzle_id: state.puzzle.id,
            guessed_movie_id: entry.movieId,
            guessed_movie_title: entry.movieTitle,
            time_taken_ms: 0,
            clarity_level: entry.clarityLevel,
            skipped: entry.movieId === null,
            guess_number: newGuesses.length, // Track which attempt this is
          }),
        })
      }
    } catch (e) {
      console.error("Failed to persist guess", e)
    } finally {
      // Always reset processing state
      setIsProcessingGuess(false)
    }
    
    return newGuesses
  }

  const handleGuessWithMovie = async (movie: { id: number; title: string }) => {
    if (!state.puzzle || gameState !== 'playing' || isProcessingGuess) return
    
    const correctMovieId = state.puzzle.movie_data?.id || state.puzzle.film_id
    const isCorrect = movie.id === correctMovieId
    const entry: GuessEntry = {
      movieId: movie.id,
      movieTitle: movie.title,
      isCorrect,
      clarityLevel: Math.round(animatedClarity), // Use the current animated clarity
    }
    const updated = await recordGuess(entry)
    advanceLevelOrEnd(isCorrect, updated)
  }


  const handleSkip = async () => {
    if (gameState !== 'playing' || isProcessingGuess) return
    const entry: GuessEntry = {
      movieId: null,
      movieTitle: 'Skipped',
      isCorrect: false,
      clarityLevel: Math.round(animatedClarity), // Use the current animated clarity
    }
    const updated = await recordGuess(entry)
    advanceLevelOrEnd(false, updated)
  }

  const endGame = async (won: boolean, guessesOverride?: GuessEntry[]) => {
    const score = won ? calculateScoreForCurrent() : 0
    const totalTimeMs = gameStartTime > 0 ? Date.now() - gameStartTime : 0
    
    // Set final clarity level - if gave up, show the final level (90%)
    const finalClarityLevel = won ? 100 : getClarityPercentForIndex(getLevels().length - 1) // Winners get 100%
    const finalGuesses = guessesOverride ?? state.guesses
    
    if (won) {
      // For correct guesses, animate to 100% clarity first
      setState(prev => ({
        ...prev,
        clarityLevel: 100, // This will trigger the animation to 100%
      }))
      
      // Wait for the reveal animation to complete
      await new Promise(resolve => setTimeout(resolve, 1200)) // Wait for animation
      
      // Trigger confetti during the reveal
      setTimeout(() => {
        confetti({ 
          particleCount: 150, 
          spread: 70, 
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1']
        })
      }, 200)
      
      // Add more confetti bursts
      setTimeout(() => {
        confetti({ 
          particleCount: 100, 
          spread: 60, 
          origin: { y: 0.7, x: 0.3 }
        })
      }, 400)
      
      setTimeout(() => {
        confetti({ 
          particleCount: 100, 
          spread: 60, 
          origin: { y: 0.7, x: 0.7 }
        })
      }, 600)
      
    } else {
      // For losses, trigger reveal animation if at final level
      if (state.clarityLevel === getClarityPercentForIndex(getLevels().length - 1)) {
        setIsRevealing(true)
        // Wait a bit for the animation to start before continuing
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    try {
      // Complete game (works for both anonymous and authenticated users)
      if (state.gameId) {
        await fetch("/api/poster-pixels/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: state.gameId,
            won,
            total_time_ms: totalTimeMs,
            final_clarity_level: finalClarityLevel,
            gave_up: !won,
          }),
        })
      }
    } catch (error) {
      console.error("Error completing game:", error)
    }

    setState(prev => ({
      ...prev,
      won,
      finalScore: score,
      timeElapsed: totalTimeMs,
      clarityLevel: finalClarityLevel,
      guesses: finalGuesses,
    }))
    // Store final time in totalGameTime for display consistency
    setTotalGameTime(Math.floor(totalTimeMs / 1000))
    
    // Transition to completed state with a fade effect
    if (won) {
      // Start the transition effect (fade out UI and poster)
      setIsTransitioning(true)
      
      // After a shorter fade out, show results with fade in
      setTimeout(() => {
        setGameState('completed')
        setShowResults(true)
      }, 600) // Wait for fade out to complete
      
      // Reset transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false)
      }, 1000)
    } else {
      // For non-winning games, show results immediately
      setGameState('completed')
      setShowResults(true)
    }
  }

  const enhanceOrGiveUpLabel = () => {
    const levels = getLevels()
    const isLast = state.currentLevelIndex >= levels.length - 1
    return isLast ? 'Give Up' : 'Skip Guess (Enhance 🔍)'
  }

  const onEnhanceOrGiveUp = () => {
    if (isProcessingGuess) return
    const levels = getLevels()
    const isLast = state.currentLevelIndex >= levels.length - 1
    if (isLast) {
      // Add a "Gave Up" entry to the guesses when giving up at final level
      const gaveUpEntry: GuessEntry = {
        movieId: null,
        movieTitle: 'Gave Up',
        isCorrect: false,
        clarityLevel: Math.round(animatedClarity), // Use the current animated clarity
      }
      recordGuess(gaveUpEntry).then((updated) => {
        endGame(false, updated)
      })
    } else {
      handleSkip()
    }
  }

  const formatPercent = (percent: number) => `${Math.round(percent)}%`

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startGame = async () => {
    if (modalState === 'howtoplay') {
      setTutorialViewed('poster-pixels')
    }

    // Start the game timer
    setGameStartTime(Date.now())

    try {
      // Start game (works for both anonymous and authenticated users)
      const response = await fetch("/api/poster-pixels/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle_id: state.puzzle!.id }),
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
        clarityLevel: getClarityPercentForIndex(0),
        currentLevelIndex: 0,
        guesses: [],
      }))
      setGameState('playing')
    } catch (error) {
      console.error("Error starting game:", error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to start game",
      }))
      setGameState('error')
    }
  }

  // Memoize excludeMovieIds to prevent unnecessary re-renders of search component
  const excludeMovieIds = useMemo(() => 
    state.guesses
      .filter(g => g.movieId !== null)
      .map(g => g.movieId as number),
    [state.guesses]
  )

  if (gameState === "ready" && modalState !== 'howtoplay' && state.puzzle?.puzzle_date) {
    return (
      <GameLanding
        gameId="poster-pixels"
        gameName="Poster Pixels"
        puzzleNumber={state.puzzle?.puzzle_number}
        puzzleDate={state.puzzle?.puzzle_date}
        backgroundColor="#3a3a3c"
        logo="/cinamini/games/PosterPixelsPoster.svg"
        logoPng="/cinamini/games/PosterPixelsPoster.png"
        emoji="🖼️"
        onStart={async () => startGame()}
      >
        <div />
      </GameLanding>
    )
  }

  return (
    <div className="game-container">
      <GameHeader 
        title="Poster Pixels" 
        onHelpClick={() => setModalState('howtoplay')}
        showArchive={true}
        archiveUrl="/game/poster-pixels/archive"
      >
        <Button variant="ghost" size="sm" onClick={() => setModalState('stats')}>
          <BarChart3 className="w-4 h-4" />
        </Button>
      </GameHeader>

      {/* How to Play Modal */}
      <GameModal
        open={modalState === 'howtoplay'}
        onOpenChange={(open) => {
          if (!open) {
            // Mark tutorial as viewed when modal is dismissed
            setTutorialViewed('poster-pixels')
          }
          setModalState(open ? 'howtoplay' : 'none')
        }}
        className="max-w-2xl"
        backdropColor="rgba(58, 58, 60, 0.3)"
      >
        <GameModalHeader>
          <GameModalTitle>How to Play Poster Pixels</GameModalTitle>
        </GameModalHeader>
        <GameModalBody>
          <InstructionGrid columns={2}>
            <InstructionCard
              step={1}
              title="Blurry Movie Poster"
              description="A heavily pixelated movie poster appears on screen. Click Skip Guess (Enhance) to reveal more details."
              darkTheme={true}
            />
            <InstructionCard
              step={2}
              title="Five Enhancements"
              description="You have 5 clarity levels. Skipping advances clarity; fewer skips before a correct guess earn higher scores."
              darkTheme={true}
            />
            <InstructionCard
              step={3}
              title="Guess Each Round"
              description="Enter a guess at any level. Wrong guesses are recorded and you continue with more clarity."
              darkTheme={true}
            />
            <InstructionCard
              step={4}
              title="Give Up Option"
              description="At the final level, the Enhance button turns into Give Up to end the game if you prefer not to guess."
              darkTheme={true}
            />
          </InstructionGrid>
          <div className="mt-6 text-center">
            <Button onClick={() => {
              setTutorialViewed('poster-pixels')
              setModalState('none')
            }} className="btn btn-primary">
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
              <div className="text-lg">Loading today&apos;s puzzle...</div>
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
          <div className="max-w-6xl mx-auto space-y-6 pb-40 relative">
            {/* Studio Timer */}
            <div className={`text-center text-muted-foreground transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <span className="text-xs">🎬</span>
                <p className="text-sm font-mono">Studio Time: {formatTime(totalGameTime)}</p>
              </div>
            </div>

            {/* Desktop Layout: Poster Left, Controls Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: Poster */}
              <div className="flex justify-center lg:justify-end">
                <canvas
                  ref={canvasRef}
                  className={`border border-[rgb(var(--silver))] shadow-3d-grey transition-all duration-500 ${
                    state.won && state.clarityLevel === 100 
                      ? 'shadow-2xl shadow-yellow-300/50 ring-4 ring-yellow-300/30' 
                      : ''
                  } ${
                    isTransitioning 
                      ? 'opacity-0 scale-95' 
                      : 'opacity-100 scale-100'
                  }`}
                  width={300}
                  height={450}
                  style={{ borderRadius: 0 }}
                />
              </div>

              {/* Right Column: Controls */}
              <div className={`space-y-6 lg:pl-4 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                {/* Search Card */}
                <Card className="border border-[rgb(var(--silver))] shadow-3d-grey" style={{ borderRadius: 0 }}>
                  <CardContent className="px-6 pb-6 pt-8">
                    <div className="space-y-4">
                      {/* Header with Skip/Enhance and Level info */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                        <div className="text-center lg:text-left">
                          <h3 className="text-lg font-semibold">Guess the Movie</h3>
                          <p className="text-sm text-muted-foreground mt-1">Search for the movie title</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                          <Button 
                            onClick={onEnhanceOrGiveUp} 
                            className="w-full sm:w-auto"
                            disabled={isAnimating || isRevealAnimating || isTransitioning || isProcessingGuess}
                          >
                            {isProcessingGuess ? 'Processing...' : isAnimating ? 'Enhancing...' : state.won && state.clarityLevel === 100 ? 'Revealing...' : enhanceOrGiveUpLabel()}
                          </Button>
                          <div className="text-sm text-muted-foreground text-center sm:text-right whitespace-nowrap">
                            Level {state.currentLevelIndex + 1} of {getLevels().length} • {formatPercent(isRevealing ? revealClarity : animatedClarity)}
                          </div>
                        </div>
                      </div>
                      
                      <PosterPixelsSearch
                        onMovieSelect={(movie) => {
                          if (movie) {
                            // Submit guess immediately without setting selectedMovie state
                            handleGuessWithMovie(movie)
                          }
                        }}
                        selectedMovie={null}
                        disabled={isAnimating || isRevealAnimating || isTransitioning || isProcessingGuess}
                        excludeMovieIds={excludeMovieIds}
                      />

                      {/* Previous Guesses */}
                      {state.guesses.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Previous guesses:</p>
                          <div className="space-y-1">
                            {state.guesses.map((g, idx) => (
                              <div key={idx} className="text-sm">
                                <span className={`font-medium ${g.isCorrect ? 'text-green-600' : g.movieTitle === 'Skipped' ? 'text-gray-500' : g.movieTitle === 'Gave Up' ? 'text-orange-600' : 'text-red-500'}`}>
                                  {g.isCorrect ? '✅' : g.movieTitle === 'Skipped' ? '⏭️' : g.movieTitle === 'Gave Up' ? '🏳️' : '❌'} {g.movieTitle === 'Skipped' ? (
                                    <strong>Skipped</strong>
                                  ) : g.movieTitle === 'Gave Up' ? (
                                    <strong>Gave Up</strong>
                                  ) : (
                                    g.movieTitle
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {gameState === 'completed' && state.puzzle && (
          <div className={`transition-all duration-500 ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <PosterPixelsResult
              puzzleId={String(state.puzzle.id)}
              puzzleNumber={state.puzzle.puzzle_number || 1}
              won={state.won}
              timeElapsed={state.timeElapsed || (gameStartTime > 0 ? Date.now() - gameStartTime : 0)}
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
          </div>
        )}
        
        {gameState === 'completed' && (
          <div className={`max-w-md mx-auto mt-6 transition-all duration-700 delay-300 ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <MorePuzzlesSection currentGameId="poster-pixels" />
            
            {isAnonymous && (
              <AnonymousResultNudge 
                gameResult={{
                  won: state.won,
                  timeElapsed: state.timeElapsed || (gameStartTime > 0 ? Date.now() - gameStartTime : 0),
                  finalScore: state.finalScore || 0,
                  clarityLevel: state.clarityLevel,
                  guesses: state.guesses
                }}
                gameName="Poster Pixels"
              />
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}