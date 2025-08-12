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
import { POSTER_PIXELS_LEVELS, getClarityPercentForIndex, getScoreForClarityPercent } from "@/lib/poster-pixels-config"

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

export default function PosterPixelsGame() {
  const { user, isAnonymous, loading: authLoading } = useGameMode()
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

  // Load today's puzzle
  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])

  // Update total game time
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameStartTime > 0 && gameState === 'playing') {
        setTotalGameTime(Math.floor((Date.now() - gameStartTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStartTime, gameState])

  // Draw pixelated poster on clarity changes
  useEffect(() => {
    if (canvasRef.current && state.puzzle && state.gameStarted) {
      try {
        drawPixelatedPoster()
      } catch (error) {
        console.error("Error calling drawPixelatedPoster:", error)
        setState(prev => ({
          ...prev,
          error: "Failed to load poster image. Please try again."
        }))
      }
    }
  }, [state.clarityLevel, state.puzzle, state.gameStarted])

  const getLevels = () => Array.from(POSTER_PIXELS_LEVELS) // Always use config levels

  const loadTodaysPuzzle = async () => {
    try {
      if (isAnonymous) {
        const localResult = localGameStorage.getTodayResult('poster-pixels')
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
          clarityLevel: getClarityPercentForIndex(initialIndex),
          currentLevelIndex: initialIndex,
          guesses: localResult?.result?.guesses || [],
        }))

        if (localResult) {
          setGameState('completed')
        } else {
          const hasPlayedBefore = localStorage.getItem('poster-pixels-played')
          setGameState('ready')
          if (!hasPlayedBefore) {
            setModalState('howtoplay')
          }
        }
      } else {
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
          clarityLevel: getClarityPercentForIndex(initialIndex),
          currentLevelIndex: initialIndex,
          guesses: data.previousGame?.guesses || [],
        }))

        if (data.hasPlayedToday) {
          setGameState('completed')
        } else {
          setGameState('ready')
          
          // Show how-to-play modal only if they've never played Poster Pixels before
          if (user && !data.hasPlayedBefore) {
            setModalState('howtoplay')
          } else if (!user) {
            // Anonymous user - check localStorage
            const hasPlayedBefore = localStorage.getItem('poster-pixels-played')
            if (!hasPlayedBefore) {
              setModalState('howtoplay')
            }
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

  const drawPixelatedPoster = () => {
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
        const pixelSize = Math.max(1, Math.floor((1 - state.clarityLevel / 100) * 50) + 1)
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
  }
  
  const drawFallbackPoster = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
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
  }

  const calculateScoreForCurrent = () => {
    const percent = Math.round(state.clarityLevel)
    return getScoreForClarityPercent(percent)
  }

  const advanceLevelOrEnd = (won: boolean, currentGuesses: GuessEntry[]) => {
    const levels = getLevels()
    const isLast = state.currentLevelIndex >= levels.length - 1
    if (won) {
      endGame(true, currentGuesses)
      return
    }
    if (isLast) {
      endGame(false, currentGuesses)
    } else {
      setState(prev => ({
        ...prev,
        currentLevelIndex: prev.currentLevelIndex + 1,
        clarityLevel: getClarityPercentForIndex(prev.currentLevelIndex + 1),
      }))
    }
  }

  const recordGuess = async (entry: GuessEntry, newGuessesArray: GuessEntry[]) => {
    setState(prev => ({ ...prev, guesses: newGuessesArray }))
    if (state.gameId && state.puzzle) {
      try {
        console.log("🎬 POSTER PIXELS CLIENT: About to call guess API", {
          gameId: state.gameId,
          puzzleId: state.puzzle.id,
          isAnonymous,
          gameStartTime,
          guessNumber: newGuessesArray.length,
          movieTitle: entry.movieTitle
        })
        
        // Calculate actual time since game start
        const timeTakenMs = gameStartTime > 0 ? Date.now() - gameStartTime : 0
        // Use the actual guess count from the new array
        const guessNumber = newGuessesArray.length
        
        const response = await fetch("/api/poster-pixels/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: state.gameId,
            puzzle_id: state.puzzle.id,
            guessed_movie_id: entry.movieId,
            guessed_movie_title: entry.movieTitle,
            time_taken_ms: timeTakenMs,
            clarity_level: entry.clarityLevel,
            skipped: entry.movieId === null,
            guess_number: guessNumber, // Use accurate guess count
          }),
        })
        
        console.log("🎬 POSTER PIXELS CLIENT: API response received", {
          status: response.status,
          isAnonymous,
          gameId: state.gameId
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error("🎬 POSTER PIXELS CLIENT: API error", errorData)
        }
      } catch (e) {
        console.error("Failed to persist guess", e)
      }
    }
  }

  const handleGuessWithMovie = async (movie: { id: number; title: string }) => {
    if (!state.puzzle || gameState !== 'playing') return
    
    const correctMovieId = state.puzzle.movie_data?.id || state.puzzle.film_id
    const isCorrect = movie.id === correctMovieId
    const entry: GuessEntry = {
      movieId: movie.id,
      movieTitle: movie.title,
      isCorrect,
      clarityLevel: state.clarityLevel,
    }
    const newGuesses = [...state.guesses, entry]
    await recordGuess(entry, newGuesses)
    advanceLevelOrEnd(isCorrect, newGuesses)
  }


  const handleSkip = async () => {
    if (gameState !== 'playing') return
    const entry: GuessEntry = {
      movieId: null,
      movieTitle: 'Skipped',
      isCorrect: false,
      clarityLevel: state.clarityLevel,
    }
    const newGuesses = [...state.guesses, entry]
    await recordGuess(entry, newGuesses)
    advanceLevelOrEnd(false, newGuesses)
  }

  const endGame = async (won: boolean, currentGuesses: GuessEntry[]) => {
    const score = won ? calculateScoreForCurrent() : 0
    const totalTimeMs = gameStartTime > 0 ? Date.now() - gameStartTime : 0
    
    // Set final clarity level - if gave up, show the final level (90%)
    const finalClarityLevel = won ? state.clarityLevel : getClarityPercentForIndex(getLevels().length - 1)
    
    try {
      if (isAnonymous) {
        // Create database-compatible structure for easier migration later
        const anonymousResult = {
          // Game session data (poster_pixels_games table compatible)
          game_session: {
            won,
            completed: true,
            total_time_ms: totalTimeMs,
            num_guesses: currentGuesses.length,
            final_clarity_level: finalClarityLevel,
            puzzle_id: state.puzzle!.id,
            start_time: new Date(gameStartTime).toISOString(),
            end_time: new Date().toISOString(),
          },
          // Individual guesses data (poster_pixels_guesses table compatible)  
          guesses: currentGuesses.map((guess, index) => ({
            guess_number: index + 1,
            guessed_movie_id: guess.movieId,
            guessed_movie_title: guess.movieTitle,
            is_correct: guess.isCorrect,
            time_taken_ms: 0, // Individual guess time not tracked in anonymous mode
            clarity_level: guess.clarityLevel,
            created_at: new Date().toISOString(),
          })),
          // Movie/puzzle metadata for display
          movie_data: {
            title: state.puzzle!.movie_data?.title || state.puzzle!.film_title,
            puzzle_id: state.puzzle!.id,
          },
          // Final result summary
          result_summary: {
            won,
            finalScore: score,
            timeElapsed: totalTimeMs,
            clarityLevel: finalClarityLevel,
          }
        }
        localGameStorage.saveDailyResult('poster-pixels', anonymousResult)
      } else if (state.gameId) {
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
    }))
    // Store final time in totalGameTime for display consistency
    setTotalGameTime(Math.floor(totalTimeMs / 1000))
    setGameState('completed')
    if (won) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }
  }

  const enhanceOrGiveUpLabel = () => {
    const levels = getLevels()
    const isLast = state.currentLevelIndex >= levels.length - 1
    return isLast ? 'Give Up' : 'Skip Guess (Enhance 🔍)'
  }

  const onEnhanceOrGiveUp = () => {
    const levels = getLevels()
    const isLast = state.currentLevelIndex >= levels.length - 1
    if (isLast) {
      // Add a "Gave Up" entry to the guesses when giving up at final level
      const gaveUpEntry: GuessEntry = {
        movieId: null,
        movieTitle: 'Gave Up',
        isCorrect: false,
        clarityLevel: getClarityPercentForIndex(levels.length - 1), // Final level (90%)
      }
      const newGuesses = [...state.guesses, gaveUpEntry]
      recordGuess(gaveUpEntry, newGuesses).then(() => {
        endGame(false, newGuesses)
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
      localStorage.setItem('poster-pixels-played', 'true')
    }

    // Start the game timer
    setGameStartTime(Date.now())

    try {
      if (isAnonymous) {
        setState(prev => ({
          ...prev,
          gameId: `anonymous-${Date.now()}`,
          gameStarted: true,
          timeElapsed: 0,
          clarityLevel: getClarityPercentForIndex(0),
          currentLevelIndex: 0,
          guesses: [],
        }))
        setGameState('playing')
      } else {
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
      >
        <Button variant="ghost" size="sm" onClick={() => setModalState('stats')}>
          <BarChart3 className="w-4 h-4" />
        </Button>
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
          <div className="max-w-6xl mx-auto space-y-6 pb-40">
            {/* Studio Timer */}
            <div className="text-center text-muted-foreground">
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
                  className="border border-[rgb(var(--silver))] shadow-3d-grey"
                  width={300}
                  height={450}
                  style={{ borderRadius: 0 }}
                />
              </div>

              {/* Right Column: Controls */}
              <div className="space-y-6 lg:pl-4">
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
                          <Button onClick={onEnhanceOrGiveUp} className="w-full sm:w-auto">
                            {enhanceOrGiveUpLabel()}
                          </Button>
                          <div className="text-sm text-muted-foreground text-center sm:text-right whitespace-nowrap">
                            Level {state.currentLevelIndex + 1} of {getLevels().length} • {formatPercent(state.clarityLevel)}
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
                        disabled={false}
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
          <PosterPixelsResult
            puzzleId={String(state.puzzle.id)}
            puzzleNumber={state.puzzle.puzzle_number || 1}
            won={state.won}
            timeElapsed={gameStartTime > 0 ? Date.now() - gameStartTime : 0}
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
            <MorePuzzlesSection currentGameId="poster-pixels" />
          </div>
        )}
      </main>
    </div>
  )
}