"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useGameMode } from "@/hooks/use-game-mode"
import { localGameStorage } from "@/lib/local-game-storage"
import AnonymousResultNudge from "../anonymous-result-nudge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { GameLanding } from "../game-landing"
import { InstructionCard, InstructionGrid } from "../instruction-card"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"
import { ShareSection } from "../share-section"
import { MorePuzzlesSection } from "../more-puzzles-section"
import { MovieGuessInput } from "./movie-guess-input"
import CastClimbStats from "./cast-climb-stats"
import { CastClimbProgress } from "./cast-climb-progress"
import { CelebrationConfetti } from "./celebration-confetti"
import Image from "next/image"
import type { MovieSearchResult } from "@/lib/types/tmdb"
import { useCastClimbShare } from "@/hooks/useGameShare"
import type { CastClimbShareData } from "@/lib/sharing"

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
  const { user, isAnonymous, loading: authLoading } = useGameMode()
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
  const [showConfetti, setShowConfetti] = useState(false)
  
  // Centralized sharing system
  const { shareText: centralizedShareText, fetchShare } = useCastClimbShare(puzzle?.id || '')

  // ============================================================================
  // EFFECTS AND DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])
  
  // Generate centralized share text when result is available
  useEffect(() => {
    if (result && puzzle && userGuesses.length > 0) {
      fetchShare().catch((error) => {
        console.log('Centralized sharing failed for Cast Climb:', error)
        // Fallback handled by using result.share_text
      })
    }
  }, [result, puzzle, userGuesses, fetchShare])

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
        throw new Error("Failed to load puzzle")
      }
      
      const data = await response.json()
      setPuzzle(data.puzzle)
      
      // Check if already played today
      if (isAnonymous) {
        // Check local storage for anonymous users
        const hasPlayedToday = localGameStorage.hasPlayedToday('cast-climb')
        if (hasPlayedToday) {
          const localResult = localGameStorage.getTodayResult('cast-climb')
          if (localResult?.result) {
            const savedResult = localResult.result as CastClimbResult
            setResult(savedResult)
            setUserGuesses(savedResult.user_guesses || [])
            setGameState('completed')
          } else {
            setGameState('ready')
          }
        } else {
          // Check if this is the user's first time playing
          const hasPlayedBefore = localStorage.getItem('cast-climb-played')
          setGameState('ready')
          if (!hasPlayedBefore) {
            setModalState('howtoplay')
          }
        }
      } else if (user && data.hasPlayed) {
        // User has already played today, show result
        const userGuesses = data.userGuesses || []
        setUserGuesses(userGuesses)
        
        let isWin = false
        let shareText = ""
        
        if (userGuesses.length > 0) {
          isWin = userGuesses.some((g: CastClimbGuess) => g.isCorrect)
          shareText = generateFallbackShareText(data.puzzle.puzzleNumber, userGuesses, isWin)
        } else {
          // No guesses found, but user has played - this shouldn't normally happen
          console.warn("User has played Cast Climb but no guesses found")
          shareText = `Cast Climb #${data.puzzle.puzzleNumber} ❌❌❌❌`
        }
        
        // Set up result state
        setResult({
          correct: isWin,
          puzzle: data.puzzle,
          user_guesses: userGuesses,
          stats: {
            games_played: 0, // Will be filled by stats API
            games_won: 0,
            current_streak: 0,
            longest_streak: 0,
            perfect_games: 0,
            average_actors_revealed: 0
          },
          share_text: shareText
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
      if (isAnonymous) {
        // For anonymous users, handle game logic locally
        const isCorrect = movie.id === puzzle.filmId
        
        const newGuess: CastClimbGuess = {
          id: Date.now().toString(),
          guessFilmId: movie.id,
          guessFilmTitle: movie.title,
          guessFilmYear: movie.releaseYear || null,
          isCorrect,
          actorsRevealed,
          solveTimeMs
        }
        
        const newGuesses = [...userGuesses, newGuess]
        setUserGuesses(newGuesses)
        
        const isGameCompleted = isCorrect || newGuesses.length >= puzzle.totalActors
        
        if (isGameCompleted) {
          // Game is completed - create result and save locally
          const anonymousResult: CastClimbResult = {
            correct: isCorrect,
            puzzle,
            user_guesses: newGuesses,
            stats: {
              games_played: localGameStorage.getGameResults('cast-climb').length + 1,
              games_won: isCorrect ? 1 : 0,
              current_streak: localGameStorage.getStats().streakData.current,
              longest_streak: localGameStorage.getStats().streakData.longest,
              perfect_games: isCorrect && newGuesses.length === 1 ? 1 : 0,
              average_actors_revealed: actorsRevealed
            },
            share_text: generateFallbackShareText(puzzle.puzzleNumber, newGuesses, isCorrect),
            game_completed: true
          }
          
          // Save to local storage
          localGameStorage.saveDailyResult('cast-climb', anonymousResult)
          
          setResult(anonymousResult)
          setGameState("completed")
          
          // Trigger celebration if won
          if (isCorrect) {
            setTimeout(() => setShowConfetti(true), 500)
          }
        } else if (!isCorrect) {
          // Wrong guess but can continue - reveal next actor
          setRevealedIndex(revealedIndex + 1)
        }
      } else {
        // For authenticated users, submit to server
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
          
          // Trigger celebration if won
          if (isCorrect) {
            setTimeout(() => setShowConfetti(true), 500)
          }
        } else if (!isCorrect) {
          // Wrong guess but can continue - reveal next actor
          setRevealedIndex(revealedIndex + 1)
        }
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
    
    setIsGuessing(true)
    const actorsRevealed = revealedIndex + 1
    const solveTimeMs = Date.now() - startTime

    try {
      if (isAnonymous) {
        // For anonymous users, handle hint skipping locally
        const newGuess: CastClimbGuess = {
          id: Date.now().toString(),
          guessFilmId: -1,
          guessFilmTitle: "_NEXT_HINT_SKIP_",
          guessFilmYear: "Unknown",
          isCorrect: false,
          actorsRevealed,
          solveTimeMs
        }
        
        const newGuesses = [...userGuesses, newGuess]
        setUserGuesses(newGuesses)
        
        const isGameCompleted = newGuesses.length >= puzzle.totalActors
        
        if (isGameCompleted) {
          // Game is completed - reached max attempts without correct guess
          const anonymousResult: CastClimbResult = {
            correct: false,
            puzzle,
            user_guesses: newGuesses,
            stats: {
              games_played: localGameStorage.getGameResults('cast-climb').length + 1,
              games_won: 0,
              current_streak: 0, // Streak broken
              longest_streak: localGameStorage.getStats().streakData.longest,
              perfect_games: 0,
              average_actors_revealed: actorsRevealed
            },
            share_text: generateFallbackShareText(puzzle.puzzleNumber, newGuesses, false),
            game_completed: true
          }
          
          // Save to local storage
          localGameStorage.saveDailyResult('cast-climb', anonymousResult)
          
          setResult(anonymousResult)
          setGameState("completed")
        } else {
          // Reveal next actor since this was a skip
          setRevealedIndex(revealedIndex + 1)
        }
      } else {
        // For authenticated users, submit to server
        const invalidMovie = {
          id: -1,
          title: "_NEXT_HINT_SKIP_",
          releaseYear: "Unknown"
        }
        
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
      if (isAnonymous) {
        // For anonymous users, handle give up locally
        const currentGuessCount = userGuesses.length
        const maxAttempts = puzzle.totalActors || 4
        
        // Create empty guesses to fill up to max attempts
        const giveUpGuesses: CastClimbGuess[] = []
        for (let i = currentGuessCount; i < maxAttempts; i++) {
          giveUpGuesses.push({
            id: `giveup-${i}`,
            guessFilmId: -1,
            guessFilmTitle: "_GIVE_UP_",
            guessFilmYear: null,
            isCorrect: false,
            actorsRevealed: i + 1,
            solveTimeMs: Date.now() - startTime
          })
        }
        
        const allGuesses = [...userGuesses, ...giveUpGuesses]
        
        // Create the result for anonymous users
        const anonymousResult: CastClimbResult = {
          correct: false,
          puzzle,
          user_guesses: allGuesses,
          stats: {
            games_played: localGameStorage.getGameResults('cast-climb').length + 1,
            games_won: 0,
            current_streak: 0,
            longest_streak: localGameStorage.getStats().streakData.longest,
            perfect_games: 0,
            average_actors_revealed: maxAttempts
          },
          share_text: generateFallbackShareText(puzzle.puzzleNumber, allGuesses, false),
          game_completed: true
        }
        
        // Save to local storage
        localGameStorage.saveDailyResult('cast-climb', anonymousResult)
        
        setResult(anonymousResult)
        setUserGuesses(allGuesses)
        setGameState("completed")
      } else {
        // For authenticated users, submit to API
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
        share_text: generateFallbackShareText(puzzle.puzzleNumber, userGuesses, false),
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

  // Helper function to generate CastClimbShareData
  const generateShareData = (puzzleNumber: number, guesses: CastClimbGuess[], isWin: boolean): CastClimbShareData => {
    return {
      guesses: guesses.map((guess, index) => ({
        isCorrect: guess.isCorrect,
        actorsRevealed: guess.actorsRevealed,
        attemptNumber: guess.attemptNumber || index + 1
      })),
      puzzle: {
        puzzleNumber
      },
      result: {
        isWin,
        totalGuesses: guesses.length
      }
    }
  }
  
  // Helper function to use centralized sharing and fallback to client generation
  const getShareText = async (puzzleNumber: number, guesses: CastClimbGuess[], isWin: boolean): Promise<string> => {
    try {
      if (puzzle && centralizedShareText) {
        return centralizedShareText
      }
      
      const shareData = generateShareData(puzzleNumber, guesses, isWin)
      await generateShare(shareData)
      
      // Return centralized share text or fallback
      return centralizedShareText || generateFallbackShareText(puzzleNumber, guesses, isWin)
    } catch (error) {
      console.error('Error generating share text:', error)
      return generateFallbackShareText(puzzleNumber, guesses, isWin)
    }
  }
  
  // Fallback share text generation (matches original format)
  const generateFallbackShareText = (puzzleNumber: number, guesses: CastClimbGuess[], isWin: boolean): string => {
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

  // Don't render the game container UI if we're showing the landing page
  if (gameState === "ready" && modalState !== 'howtoplay') {
    return (
      <GameLanding
        gameId="cast-climb"
        gameName="Cast Climb"
        puzzleNumber={puzzle?.puzzleNumber}
        puzzleDate={puzzle?.puzzleDate}
        backgroundColor="#99251d"
        emoji="🎭"
        onStart={startGame}
        showBackButton={true}
      >
        {/* How to Play content removed from splash page */}
      </GameLanding>
    )
  }

  return (
    <div className="game-container">
      {/* Celebration Confetti */}
      <CelebrationConfetti 
        show={showConfetti} 
        onComplete={() => setShowConfetti(false)}
      />
      <GameHeader 
        title="Cast Climb" 
        onHelpClick={showHowToPlay}
      >
        {(gameState === 'ready' || gameState === 'completed') && !isAnonymous && (
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
          <GameModalTitle>How to Play Cast Climb</GameModalTitle>
        </GameModalHeader>
        <GameModalBody>
          <InstructionGrid columns={2}>
            <InstructionCard
              step={1}
              title="Meet the Cast"
              description="See actors from a mystery movie revealed one by one, starting with supporting cast."
              darkTheme={true}
              example={
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">🎭</span>
                  </div>
                  <div className="text-left">
                    <p className="text-foreground text-sm font-medium">Supporting Actor</p>
                    <p className="text-muted-foreground text-xs">Actor 1 of 4</p>
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={2}
              title="Make Your Guess"
              description="Search for and guess the movie title after each actor reveal. Wrong guesses unlock the next actor."
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    Search movies...
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={3}
              title="Climb the Cast"
              description="Try to guess with as few actor hints as possible. You get up to 4 attempts before the game ends."
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="text-foreground text-sm font-mono">
                    ❌❌✅ (Won on 3rd guess)
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={4}
              title="Share Your Score"
              description="Perfect games are won with just the first actor. Can you climb to the top?"
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="text-foreground text-sm font-mono">
                    Cast Climb #123 ✅
                  </div>
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

        {/* Ready state is now handled by the landing page above */}

        {gameState === "playing" && puzzle && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Progress Visualization */}
              <div className="order-2 lg:order-1">
                <div className="shadow-3d-grey bg-white border border-[rgb(var(--silver))] p-4" style={{ borderRadius: 0 }}>
                  <CastClimbProgress
                    totalActors={puzzle.actors.length}
                    revealedIndex={revealedIndex}
                    userGuesses={userGuesses}
                    gameCompleted={false}
                    className="lg:sticky lg:top-20"
                    actors={puzzle.actors}
                  />
                </div>
              </div>
              
              {/* Main Game Card */}
              <div className="order-1 lg:order-2 max-w-md mx-auto lg:mx-0">
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
                    className="w-full border border-[rgb(var(--silver))] hover:border-[rgb(153,37,29)] hover:text-[rgb(153,37,29)]" 
                    onClick={handleNextHint} 
                    disabled={isGuessing || revealedIndex >= puzzle.actors.length - 1}
                  >
                    {revealedIndex >= puzzle.actors.length - 1 ? "No More Hints" : "Skip Round (Next Hint)"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border border-[rgb(var(--silver))] hover:border-[rgb(153,37,29)] hover:text-[rgb(153,37,29)]" 
                    onClick={handleGiveUp} 
                    disabled={isGuessing}
                  >
                    Give Up
                  </Button>
                </div>
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        )}

        {gameState === "completed" && result && puzzle && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="max-w-md mx-auto space-y-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className={result.correct ? "text-green-600" : "text-cinema-red"}>
                  {result.correct ? "Congratulations!" : "Better luck tomorrow!"}
                </CardTitle>
                <p className="text-muted-foreground">
                  {puzzle.filmTitle} ({puzzle.filmReleaseYear})
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {/* Your Guesses Section */}
                {result.user_guesses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Your Guesses</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.user_guesses.map((guess, index) => (
                        <div 
                          key={guess.id || index} 
                          className={`flex items-center justify-between text-sm bg-white p-3 border ${
                            guess.isCorrect 
                              ? 'border-green-500 shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94),3px_3px_0px_rgb(34,197,94),4px_4px_0px_rgb(34,197,94)]' 
                              : 'border-[rgb(153,37,29)] shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div className="flex items-center gap-2">
                            {guess.isCorrect ? (
                              <span className="text-green-600">✅</span>
                            ) : (
                              <span className="text-cinema-red">❌</span>
                            )}
                            <span className="truncate max-w-32">
                              {guess.guessFilmTitle === "_NEXT_HINT_SKIP_" || guess.guessFilmTitle === "_GIVE_UP_" ? (
                                <strong>Skipped</strong>
                              ) : (
                                `${guess.guessFilmTitle}${guess.guessFilmYear && guess.guessFilmYear !== 'Unknown' ? ` (${guess.guessFilmYear})` : ''}`
                              )}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {guess.actorsRevealed} actor{guess.actorsRevealed !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

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
                  shareText={centralizedShareText || result.share_text}
                  shareUrl="https://cinamini.app/game/cast-climb"
                />
              </CardContent>
            </Card>
            
            {/* Progress Visualization - moved below results */}
            <div className="shadow-3d-grey bg-white border border-[rgb(var(--silver))] p-4" style={{ borderRadius: 0 }}>
              <CastClimbProgress
                totalActors={puzzle.actors.length}
                revealedIndex={puzzle.actors.length - 1}
                userGuesses={result.user_guesses}
                gameCompleted={true}
                isCorrect={result.correct}
                actors={puzzle.actors}
              />
            </div>
            
            {/* More Puzzles Section */}
            <MorePuzzlesSection currentGameId="cast-climb" />
            
            {isAnonymous && (
              <AnonymousResultNudge 
                gameResult={result}
                gameName="Cast Climb"
              />
            )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}