"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Play, BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { HowToPlayModal } from "../how-to-play-modal"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import { ShareSection } from "../share-section"
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
  guessFilmYear?: string | null
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

type GameState = "loading" | "ready" | "playing" | "completed" | "error"
type ModalState = "none" | "howtoplay" | "stats"

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CastClimbGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>("loading")
  const [modalState, setModalState] = useState<ModalState>("none")
  const [puzzle, setPuzzle] = useState<CastClimbPuzzle | null>(null)
  const [userGuesses, setUserGuesses] = useState<CastClimbGuess[]>([])
  const [revealedIndex, setRevealedIndex] = useState(0)
  const [isGuessing, setIsGuessing] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [result, setResult] = useState<CastClimbResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // EFFECTS AND DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadTodaysPuzzle()
  }, [])

  // Elapsed time effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (gameState === "playing" && startTime > 0) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameState, startTime])

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
        // Check if this is the user's first time playing
        const hasPlayedBefore = localStorage.getItem('cast-climb-played')
        setGameState("ready")
        if (!hasPlayedBefore) {
          setModalState("howtoplay")
        }
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
    // Mark that the user has played before if coming from how to play
    if (modalState === 'howtoplay') {
      localStorage.setItem('cast-climb-played', 'true')
    }
    setGameState("playing")
    setStartTime(Date.now())
    setRevealedIndex(0)
    setUserGuesses([])
    setModalState("none")
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
          guessFilmYear: movie.releaseYear,
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
      } else if (!isCorrect) {
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

  const handleNextHint = async () => {
    if (!puzzle) return
    
    // Submit an empty/invalid guess to mark this as a missed attempt
    const invalidMovie = {
      id: -1,
      title: "_NEXT_HINT_SKIP_",
      releaseYear: "Unknown"
    }
    
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
          guessFilmId: invalidMovie.id,
          guessFilmTitle: invalidMovie.title,
          guessFilmYear: invalidMovie.releaseYear,
          actorsRevealed,
          solveTimeMs
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit hint skip")
      }

      const data = await response.json()
      const isGameCompleted = data.game_completed
      const newGuesses = data.user_guesses
      
      // Update user guesses
      setUserGuesses(newGuesses)

      if (isGameCompleted) {
        // Game is completed (reached max attempts)
        setResult(data)
        setGameState("completed")
      } else {
        // Reveal next actor since this was a skip
        setRevealedIndex(revealedIndex + 1)
      }
    } catch (err) {
      console.error("Error skipping to next hint:", err)
      // Don't create additional records on error - just show error to user
      setError("Failed to skip hint. Please try again.")
    } finally {
      setIsGuessing(false)
    }
  }

  const handleGiveUp = async () => {
    if (!puzzle) return
    
    setIsGuessing(true)
    
    try {
      // Calculate how many empty guesses we need to reach 4 total
      const currentGuessCount = userGuesses.length
      const maxAttempts = puzzle.totalActors || 4
      const emptyGuessesNeeded = Math.max(1, maxAttempts - currentGuessCount) // Ensure at least 1 request
      
      // Submit empty guesses to fill up to max attempts
      for (let i = 0; i < emptyGuessesNeeded; i++) {
        const actorsRevealed = Math.min(revealedIndex + 1 + i, maxAttempts)
        const solveTimeMs = Date.now() - startTime
        
        const response = await fetch("/api/cast-climb/guess", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            guessFilmId: -1,
            guessFilmTitle: "_GIVE_UP_",
            guessFilmYear: null,
            actorsRevealed,
            solveTimeMs
          })
        })

        if (!response.ok) {
          throw new Error("Failed to submit give up")
        }
        
        // Only get the final result from the last API call
        if (i === emptyGuessesNeeded - 1) {
          const data: CastClimbResult = await response.json()
          setResult(data)
          setUserGuesses(data.user_guesses)
          setGameState("completed")
        }
      }
    } catch (err) {
      console.error("Error giving up:", err)
      // Fallback to local state if API fails
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
        share_text: generateClientShareText(puzzle.puzzleNumber, userGuesses, false),
        game_completed: true
      })
      setGameState("completed")
    } finally {
      setIsGuessing(false)
    }
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
    setModalState('stats')
  }

  const showHowToPlay = () => {
    setModalState('howtoplay')
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="game-container">
      <GameHeader 
        title="Cast Climb" 
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
        title="Cast Climb"
        instructions={
          <div className="space-y-4">
            <p className="text-neutral-600">
              Guess the movie by its cast. Wrong guesses reveal more actors!
            </p>
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">How to Play:</h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• See actors from a mystery movie one by one</li>
                <li>• Search and guess the movie title after each hint</li>
                <li>• Wrong guesses reveal the next actor in the cast</li>
                <li>• Try to guess with as few hints as possible!</li>
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
          <CastClimbStats />
        </GameModalBody>
      </GameModal>

      <main className="flex-1 overflow-auto p-4">
        {gameState === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse text-lg">Loading today's puzzle...</div>
            </div>
          </div>
        )}

        {gameState === "error" && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <p className="text-red-500 mb-4">{error || "An error occurred"}</p>
                <Button onClick={loadTodaysPuzzle} className="w-full">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "ready" && puzzle && (
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
                  <h3 className="font-semibold mb-2">Today's Challenge</h3>
                  <p className="text-sm text-muted-foreground">
                    Can you guess the movie with just one actor hint?
                  </p>
                </div>

                <Button onClick={startGame} className="w-full" size="lg" variant="primary">
                  <Play className="w-4 h-4 mr-2" />
                  Start Playing
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Daily puzzle • {new Date().toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "playing" && puzzle && (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Cast Climb #{puzzle.puzzleNumber}</CardTitle>
                <p className="text-muted-foreground">
                  Actor {revealedIndex + 1} of {puzzle.actors.length}
                  {userGuesses.length > 0 && ` • ${userGuesses.length} guess${userGuesses.length !== 1 ? 'es' : ''}`}
                </p>
                {elapsedTime > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Time: {Math.floor(elapsedTime / 1000)}s
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-6 text-center space-y-4">
                  {/* Actor Photo */}
                  <div className="flex justify-center">
                    <div className="w-32 h-40 bg-muted-foreground/10 rounded-lg overflow-hidden shadow-md">
                      {puzzle.actors[revealedIndex] && puzzle.actors[revealedIndex].profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${puzzle.actors[revealedIndex].profile_path}`}
                          alt={`${puzzle.actors[revealedIndex].name} photo`}
                          width={128}
                          height={160}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <div className="text-2xl mb-2">🎭</div>
                            <div className="text-xs">No Photo</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Actor Name */}
                  <div>
                    <p className="font-semibold text-xl">{puzzle.actors[revealedIndex]?.name || 'Unknown Actor'}</p>
                  </div>
                </div>

                {/* Show previous wrong guesses */}
                {userGuesses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Previous guesses:</p>
                    <div className="space-y-1">
                      {userGuesses.map((guess) => (
                        <div key={guess.id} className="text-sm">
                          <span className="text-red-500 font-medium">
                            ❌ {guess.guessFilmTitle === "_NEXT_HINT_SKIP_" ? (
                              <strong>Skipped</strong>
                            ) : guess.guessFilmTitle === "_GIVE_UP_" ? (
                              <strong>Skipped</strong>
                            ) : guess.guessFilmTitle ? (
                              `${guess.guessFilmTitle}${guess.guessFilmYear && guess.guessFilmYear !== 'Unknown' ? ` (${guess.guessFilmYear})` : ''}`
                            ) : (
                              <strong>No Title Found</strong>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <MovieGuessInput
                  onGuess={handleGuess}
                  loading={isGuessing}
                  placeholder="Start typing a movie title..."
                  disabled={isGuessing}
                />
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleNextHint} 
                    disabled={isGuessing || revealedIndex >= puzzle.actors.length - 1}
                  >
                    {revealedIndex >= puzzle.actors.length - 1 ? "No More Hints" : "Next Hint"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGiveUp} 
                    disabled={isGuessing}
                  >
                    Give Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "completed" && result && puzzle && (
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
                    src={`https://image.tmdb.org/t/p/w500${puzzle.filmPosterUrl}`} 
                    alt={`${puzzle.filmTitle} poster`}
                    width={200} 
                    height={300} 
                    className="mx-auto rounded-lg"
                  />
                )}
                
                {/* Show complete cast now that game is over */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Cast</h3>
                  <div className="space-y-2 text-left">
                    {puzzle.actors.map((actor, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-medium">{actor.name}</span>
                        <span className="text-sm text-muted-foreground">as {actor.character}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {puzzle.funFact && (
                  <p className="text-sm text-muted-foreground italic">
                    {puzzle.funFact}
                  </p>
                )}
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-mono text-lg">{result.share_text}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.correct ? 
                      `Solved in ${result.user_guesses.length} guess${result.user_guesses.length !== 1 ? 'es' : ''}` :
                      `Failed after ${result.user_guesses.length} guess${result.user_guesses.length !== 1 ? 'es' : ''}`
                    }
                  </p>
                </div>
                <ShareSection 
                  shareText={result.share_text}
                  shareUrl="https://cinamini.app"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}