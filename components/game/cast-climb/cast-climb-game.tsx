"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Play, BarChart3, Share2, Copy, Check } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"
import { MovieGuessInput } from "./movie-guess-input"
import CastClimbStats from "./cast-climb-stats"
import Image from "next/image"
import type { MovieSearchResult } from "@/lib/types/tmdb"

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface CastClimbActor {
  name: string
  character: string
  order: number
  profile_path: string | null
  tmdb_id: number
}

interface CastClimbPuzzle {
  id: string
  puzzleDate: string
  puzzleNumber: number
  filmId: number
  filmTitle: string
  filmPosterUrl: string | null
  filmReleaseYear: number
  actors: CastClimbActor[]
  totalActors: number
  difficultyLevel: number
  funFact: string | null
}

interface CastClimbGuess {
  id: string
  guessFilmId: number
  guessFilmTitle: string
  isCorrect: boolean
  actorsRevealed: number
  solveTimeMs: number | null
  attemptNumber: number
  createdAt: string
}

interface CastClimbResult {
  correct: boolean
  puzzle: CastClimbPuzzle
  user_guesses: CastClimbGuess[]
  stats: {
    games_played: number
    games_won: number
    current_streak: number
    longest_streak: number
    perfect_games: number
    average_actors_revealed: number
  }
  share_text: string
  game_completed?: boolean
}

type GameState = "loading" | "start" | "playing" | "completed" | "stats" | "error"

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CastClimbGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>("loading")
  const [puzzle, setPuzzle] = useState<CastClimbPuzzle | null>(null)
  const [userGuesses, setUserGuesses] = useState<CastClimbGuess[]>([])
  const [revealedIndex, setRevealedIndex] = useState(0)
  const [isGuessing, setIsGuessing] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [result, setResult] = useState<CastClimbResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)

  // ============================================================================
  // EFFECTS AND DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadTodaysPuzzle()
  }, [])

  const loadTodaysPuzzle = async () => {
    try {
      setGameState("loading")
      setError(null)
      
      const response = await fetch("/api/cast-climb/puzzle/today")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/login")
          return
        }
        throw new Error("Failed to load puzzle")
      }
      
      const data = await response.json()
      setPuzzle(data.puzzle)
      
      if (data.hasPlayed && data.userGuesses.length > 0) {
        // User has already played today, show result
        setUserGuesses(data.userGuesses)
        const lastGuess = data.userGuesses[data.userGuesses.length - 1]
        const isWin = data.userGuesses.some((g: CastClimbGuess) => g.isCorrect)
        
        // Set up result state
        setResult({
          correct: isWin,
          puzzle: data.puzzle,
          user_guesses: data.userGuesses,
          stats: {
            games_played: 0, // Will be filled by stats API
            games_won: 0,
            current_streak: 0,
            longest_streak: 0,
            perfect_games: 0,
            average_actors_revealed: 0
          },
          share_text: generateClientShareText(data.puzzle.puzzleNumber, data.userGuesses, isWin)
        })
        setGameState("completed")
      } else {
        setGameState("start")
      }
    } catch (err) {
      console.error("Error loading puzzle:", err)
      setError("Failed to load today's puzzle. Please try again.")
      setGameState("error")
    }
  }

  // ============================================================================
  // GAME LOGIC
  // ============================================================================

  const startGame = () => {
    setGameState("playing")
    setStartTime(Date.now())
    setRevealedIndex(0)
    setUserGuesses([])
  }

  const handleGuess = async (movie: MovieSearchResult) => {
    if (!puzzle) return
    
    setIsGuessing(true)
    const actorsRevealed = revealedIndex + 1
    const solveTimeMs = Date.now() - startTime

    try {
      const response = await fetch("/api/cast-climb/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          puzzleId: puzzle.id,
          guessFilmId: movie.id,
          guessFilmTitle: movie.title,
          actorsRevealed,
          solveTimeMs
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit guess")
      }

      const data: CastClimbResult = await response.json()
      const isCorrect = data.correct
      const newGuesses = data.user_guesses
      const isGameCompleted = data.game_completed
      
      // Update user guesses
      setUserGuesses(newGuesses)

      if (isGameCompleted) {
        // Game is completed (either correct or max attempts reached)
        setResult(data)
        setGameState("completed")
      } else {
        // Wrong guess but can continue - reveal next actor
        setRevealedIndex(revealedIndex + 1)
      }
    } catch (err) {
      console.error("Error submitting guess:", err)
      setError("Failed to submit your guess. Please try again.")
      setGameState("error")
    } finally {
      setIsGuessing(false)
    }
  }

  const handleGiveUp = async () => {
    if (!puzzle) return
    
    // Create a "give up" result by showing what would happen if they exhausted all actors
    setResult({
      correct: false,
      puzzle,
      user_guesses: userGuesses,
      stats: {
        games_played: 0,
        games_won: 0,
        current_streak: 0,
        longest_streak: 0,
        perfect_games: 0,
        average_actors_revealed: 0
      },
      share_text: generateClientShareText(puzzle.puzzleNumber, userGuesses, false)
    })
    setGameState("completed")
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const generateClientShareText = (puzzleNumber: number, guesses: CastClimbGuess[], isWin: boolean): string => {
    let pattern = ''
    
    if (isWin) {
      // Show incorrect attempts followed by success
      const incorrectAttempts = guesses.length - 1
      pattern = "❌".repeat(incorrectAttempts) + "✅"
    } else {
      // All attempts were incorrect
      pattern = "❌".repeat(guesses.length)
    }
    
    return `Cast Climb #${puzzleNumber} ${pattern}`
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

  const handleShare = async () => {
    if (!result) return
    
    try {
      setCopying(true)
      const shareText = result.share_text + "\n\nPlay Cast Climb at cinamini.app"
      
      // Try to use the Web Share API first
      if (navigator.share && /mobile/i.test(navigator.userAgent)) {
        await navigator.share({
          text: shareText,
          url: 'https://cinamini.app'
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText)
        // Show success feedback for a moment
        setTimeout(() => setCopying(false), 2000)
        return
      }
    } catch (error) {
      console.error('Sharing failed:', error)
      // If clipboard fails, try manual fallback
      try {
        await navigator.clipboard.writeText(result.share_text)
        setTimeout(() => setCopying(false), 2000)
      } catch (clipboardError) {
        console.error('Clipboard failed:', clipboardError)
      }
    } finally {
      if (!copying) setCopying(false)
    }
  }

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  if (gameState === "stats") {
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
          <CastClimbStats />
        </main>
      </div>
    )
  }

  if (gameState === "loading") {
    return (
      <div className="game-container">
        <header className="game-header">
          <div></div>
          <h1 className="game-title">Cast Climb</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-pulse text-lg text-white">Loading today's puzzle...</div>
          </div>
        </main>
      </div>
    )
  }

  if (gameState === "error" || !puzzle) {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="game-title">Cast Climb</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-red-500 mb-4">{error || "An error occurred"}</p>
              <Button onClick={loadTodaysPuzzle} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (gameState === "completed" && result) {
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="game-title">Cast Climb</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={showStats}>
              <BarChart3 className="w-4 h-4" />
            </Button>
            <GameSettingsButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto space-y-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className={result.correct ? "text-green-600" : "text-red-600"}>
                  {result.correct ? "Congratulations!" : "Better luck tomorrow!"}
                </CardTitle>
                <p className="text-muted-foreground">
                  {puzzle.filmTitle} ({puzzle.filmReleaseYear})
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {puzzle.filmPosterUrl && (
                  <Image 
                    src={puzzle.filmPosterUrl} 
                    alt={`${puzzle.filmTitle} poster`}
                    width={200} 
                    height={300} 
                    className="mx-auto rounded-lg"
                  />
                )}
                {puzzle.funFact && (
                  <p className="text-sm text-muted-foreground italic">
                    {puzzle.funFact}
                  </p>
                )}
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-mono text-lg">{result.share_text}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Solved in {result.user_guesses.length} guess{result.user_guesses.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                <Button 
                  onClick={handleShare}
                  disabled={copying}
                  className="w-full"
                  variant="outline"
                >
                  {copying ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Result
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (gameState === "playing") {
    const currentActor = puzzle.actors[revealedIndex]
    
    return (
      <div className="game-container">
        <header className="game-header">
          <Button variant="ghost" size="sm" onClick={() => setGameState('start')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            End
          </Button>
          <h1 className="game-title">Cast Climb</h1>
          <GameSettingsButton />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Cast Climb #{puzzle.puzzleNumber}</CardTitle>
                <p className="text-muted-foreground">
                  Actor {revealedIndex + 1} of {puzzle.actors.length}
                  {userGuesses.length > 0 && ` • ${userGuesses.length} guess${userGuesses.length !== 1 ? 'es' : ''}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="font-semibold text-lg">{currentActor.name}</p>
                </div>

                {/* Show previous wrong guesses */}
                {userGuesses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Previous guesses:</p>
                    {userGuesses.map((guess, index) => (
                      <div key={guess.id} className="flex items-center gap-2 text-sm">
                        <span className="text-red-500">❌</span>
                        <span className="text-muted-foreground">{guess.guessFilmTitle}</span>
                      </div>
                    ))}
                  </div>
                )}

                <MovieGuessInput
                  onGuess={handleGuess}
                  loading={isGuessing}
                  placeholder="Start typing a movie title..."
                  disabled={isGuessing}
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleGiveUp} 
                    disabled={isGuessing}
                  >
                    Give Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Start screen
  return (
    <div className="game-container">
      <header className="game-header">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
        <h1 className="game-title">Cast Climb</h1>
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
              <CardTitle>Cast Climb #{puzzle.puzzleNumber}</CardTitle>
              <p className="text-muted-foreground">
                Guess the movie by its cast. Wrong guesses reveal more actors.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">How to Play:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• See actors from a mystery movie one by one</li>
                  <li>• Search and guess the movie title after each hint</li>
                  <li>• Wrong guesses reveal the next actor in the cast</li>
                  <li>• Try to guess with as few hints as possible!</li>
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