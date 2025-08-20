"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useGameMode } from "@/hooks/use-game-mode"
import { localGameStorage } from "@/lib/local-game-storage"
import { hasTutorialBeenViewed, setTutorialViewed } from "@/lib/game-tutorial-cookies"
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
import { formatGameTime } from "@/lib/utils"
import { CelebrationConfetti } from "./celebration-confetti"
import { SiteFooter } from "../../site-footer"
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
  studio_time_ms?: number
}

type GameState = "loading" | "ready" | "playing" | "completed" | "error"
type ModalState = "none" | "howtoplay" | "stats"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Live timer formatting for gameplay (MM:SS format)
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

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
          const hasSeenTutorial = hasTutorialBeenViewed('cast-climb')
          setGameState('ready')
          if (!hasSeenTutorial) {
            setModalState('howtoplay')
          }
        }
      } else if (user) {
        // Handle authenticated user states
        if (data.hasPlayed) {
          // User has completed the game today, show result
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
        } else if (data.hasStarted) {
          // User has started but not completed the game, resume from where they left off
          const userGuesses = data.userGuesses || []
          setUserGuesses(userGuesses)
          setRevealedIndex(data.lastActorsRevealed - 1) // Convert to 0-based index
          setGameState("playing")
          setStartTime(Date.now()) // Reset timer for resumed game
          
          // Don't show how-to-play modal when resuming
          setModalState("none")
        } else {
          // User hasn't started the game today
          setGameState("ready")
          
          // Show how-to-play modal only if they've never seen the tutorial
          const hasSeenTutorial = hasTutorialBeenViewed('cast-climb')
          if (!hasSeenTutorial) {
            setModalState("howtoplay")
          }
        }
      } else {
        // Anonymous user
        setGameState("ready")
        
        // Check if this is the user's first time playing
        const hasSeenTutorial = hasTutorialBeenViewed('cast-climb')
        if (!hasSeenTutorial) {
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
    // Mark that the user has seen the tutorial if coming from how to play
    if (modalState === 'howtoplay') {
      setTutorialViewed('cast-climb')
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
    const studioTimeMs = Date.now() - startTime

    try {
      if (isAnonymous) {
        // For anonymous users, call API to trigger webhook but handle game logic locally
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
            solveTimeMs,
            isSkip: false
          })
        })
        
        // We don't check response.ok for anonymous users since they may get a 401
        // Just continue with local logic
        
        const isCorrect = movie.id === puzzle.filmId
        
        const newGuess: CastClimbGuess = {
          id: Date.now().toString(),
          guessFilmId: movie.id,
          guessFilmTitle: movie.title,
          guessFilmYear: movie.releaseYear || null,
          isCorrect,
          actorsRevealed,
          solveTimeMs,
          attemptNumber: userGuesses.length + 1,
          createdAt: new Date().toISOString()
        }
        
        const newGuesses = [...userGuesses, newGuess]
        setUserGuesses(newGuesses)
        
        const isGameCompleted = isCorrect || newGuesses.length >= puzzle.totalActors
        
        if (isGameCompleted) {
          // Game is completed - create result and save locally
          const studioTimeMs = Date.now() - startTime
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
            share_text: generateFallbackShareText(puzzle.puzzleNumber, newGuesses, isCorrect, studioTimeMs),
            game_completed: true,
            studio_time_ms: studioTimeMs
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
            solveTimeMs,
            studioTimeMs
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
    const studioTimeMs = Date.now() - startTime

    try {
      if (isAnonymous) {
        // For anonymous users, call the API to trigger webhooks, then handle locally
        try {
          await fetch("/api/cast-climb/guess", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              puzzleId: puzzle.id,
              guessFilmId: -1,
              guessFilmTitle: "_NEXT_HINT_SKIP_",
              guessFilmYear: "Unknown",
              actorsRevealed,
              solveTimeMs,
              isSkip: true
            })
          })
          // API call succeeds or fails, we continue with local logic
        } catch (webhookError) {
          console.warn("Webhook call failed for anonymous skip:", webhookError)
          // Continue with local logic even if webhook fails
        }
        
        // Handle hint skipping locally
        const newGuess: CastClimbGuess = {
          id: Date.now().toString(),
          guessFilmId: -1,
          guessFilmTitle: "_NEXT_HINT_SKIP_",
          guessFilmYear: "Unknown",
          isCorrect: false,
          actorsRevealed,
          solveTimeMs,
          attemptNumber: userGuesses.length + 1,
          createdAt: new Date().toISOString()
        }
        
        const newGuesses = [...userGuesses, newGuess]
        setUserGuesses(newGuesses)
        
        const isGameCompleted = newGuesses.length >= puzzle.totalActors
        
        if (isGameCompleted) {
          // Game is completed - reached max attempts without correct guess
          const studioTimeMs = Date.now() - startTime
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
            share_text: generateFallbackShareText(puzzle.puzzleNumber, newGuesses, false, studioTimeMs),
            game_completed: true,
            studio_time_ms: studioTimeMs
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
            solveTimeMs,
            studioTimeMs
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
        // For anonymous users, call API to trigger webhook, then handle give up locally
        try {
          await fetch("/api/cast-climb/guess", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              puzzleId: puzzle.id,
              guessFilmId: -1,
              guessFilmTitle: "_GIVE_UP_",
              guessFilmYear: "Unknown",
              actorsRevealed: revealedIndex + 1,
              solveTimeMs: Date.now() - startTime,
              isSkip: true
            })
          })
          // API call succeeds or fails, we continue with local logic
        } catch (webhookError) {
          console.warn("Webhook call failed for anonymous give up:", webhookError)
          // Continue with local logic even if webhook fails
        }
        
        // Handle give up locally
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
            solveTimeMs: Date.now() - startTime,
            attemptNumber: i + 1,
            createdAt: new Date().toISOString()
          })
        }
        
        const allGuesses = [...userGuesses, ...giveUpGuesses]
        
        // Create the result for anonymous users
        const studioTimeMs = Date.now() - startTime
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
          share_text: generateFallbackShareText(puzzle.puzzleNumber, allGuesses, false, studioTimeMs),
          game_completed: true,
          studio_time_ms: studioTimeMs
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
          const studioTimeMs = Date.now() - startTime
          
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
              solveTimeMs,
              studioTimeMs
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
      // Note: generateShare is not available in this context, so we'll just return the centralized text
      // Use generateShare as a fallback if centralizedShareText is not available
      if (typeof generateShare === "function") {
        return centralizedShareText || generateShare(shareData)
      }
      // Return centralized share text or fallback
      return centralizedShareText || generateFallbackShareText(puzzleNumber, guesses, isWin)
    } catch (error) {
      console.error('Error generating share text:', error)
      return generateFallbackShareText(puzzleNumber, guesses, isWin)
    }
  }
  
  // Fallback share text generation (matches centralized format)
  const generateFallbackShareText = (puzzleNumber: number, guesses: CastClimbGuess[], isWin: boolean, studioTimeMs?: number): string => {
    const ACTORS_TO_SHOW = 4
    let pattern = ''
    let resultText = ''
    
    if (isWin) {
      // New pattern logic to match centralized system:
      // - Wrong attempts shown as person emojis 🧑 (one per wrong guess before the win)
      // - Then a ✅ when correct
      // - Then remaining reveals as 🎭 until 4 total reveals
      const wrongAttemptsBeforeWin = Math.max(0, guesses.length - 1)
      const remainingActors = Math.max(0, ACTORS_TO_SHOW - guesses.length)

      pattern = '🧑'.repeat(wrongAttemptsBeforeWin) + '✅' + '🎭'.repeat(remainingActors)

      if (guesses.length === 1) {
        resultText = '\nGot the 🎬 on the first try! 🥇'
      } else {
        resultText = `\nGot the 🎬 in ${guesses.length} guesses`
      }
    } else {
      // Loss pattern: four faces then a red X
      // Example: 🧑🧑🧑🧑❌
      pattern = '🧑'.repeat(ACTORS_TO_SHOW) + '❌'
      resultText = "\nWasn't able to get the movie."
    }
    
    // Add studio time to the end of the result text if provided
    if (studioTimeMs !== undefined) {
      resultText += ` • ${formatGameTime(studioTimeMs)}`
    }

    return `Cast Climb #${puzzleNumber} ${pattern}${resultText}`
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
        logo="/cinamini/games/CastClimbPoster.svg"
        logoPng="/cinamini/games/CastClimbPoster.png"
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
        onOpenChange={(open) => {
          if (!open) {
            // Mark tutorial as viewed when modal is dismissed
            setTutorialViewed('cast-climb')
          }
          setModalState(open ? 'howtoplay' : 'none')
        }}
        className="max-w-2xl"
        backdropColor="rgba(153, 37, 29, 0.3)"
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
            <Button onClick={() => {
              setTutorialViewed('cast-climb')
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
          <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "#99251d" }}>
            <div className="text-center space-y-8 px-4">
              {/* Large emoji icon */}
              <div className="text-8xl">🎬</div>
              
              {/* Error message */}
              <div className="space-y-2">
                <h2 className="text-white text-2xl font-bold font-funnel">The cast took a break!</h2>
                <p className="text-white/80 text-lg max-w-md">{error || "Something went wrong with today's puzzle."}</p>
              </div>
              
              {/* Restart button */}
              <Button 
                onClick={loadTodaysPuzzle} 
                className="bg-[#99251d] text-white border-2 border-white font-bold px-8 py-4 text-lg transition-all duration-200 hover:bg-white hover:text-[#99251d] hover:border-[#99251d] hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]"
                style={{ borderRadius: 0 }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Ready state is now handled by the landing page above */}

        {gameState === "playing" && puzzle && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Studio Timer */}
            <div className="text-center text-muted-foreground">
              <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <span className="text-xs">🎬</span>
                <p className="text-sm font-mono">Studio Time: {formatTime(Math.floor(elapsedTime / 1000))}</p>
              </div>
            </div>

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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-6 text-center space-y-4">
                  {/* Actor Photo */}
                  <div className="flex justify-center">
                    <div className="w-32 h-40 bg-muted-foreground/10 border border-[#3a3a3c] shadow-[1px_1px_0px_rgb(58,58,60),2px_2px_0px_rgb(58,58,60),3px_3px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60)] overflow-hidden" style={{ borderRadius: 0 }}>
                      {puzzle.actors[revealedIndex] && puzzle.actors[revealedIndex].profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${puzzle.actors[revealedIndex].profile_path}`}
                          alt={`${puzzle.actors[revealedIndex].name} photo`}
                          width={128}
                          height={160}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          style={{ borderRadius: 0 }}
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
                  excludeMovieIds={userGuesses
                    .filter(g => g.guessFilmId && g.guessFilmId > 0)
                    .map(g => g.guessFilmId)}
                />
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full bg-[#99251d] text-white border border-[#99251d] hover:bg-white hover:text-[#99251d] hover:border-[#99251d] hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]"
                    onClick={revealedIndex >= puzzle.actors.length - 1 ? handleGiveUp : handleNextHint}
                    disabled={isGuessing}
                  >
                    {revealedIndex >= puzzle.actors.length - 1 ? "Give Up" : "Skip Guess (Next Hint)"}
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
                  <div className="flex justify-center">
                    <div className="border border-[#3a3a3c] shadow-[1px_1px_0px_rgb(58,58,60),2px_2px_0px_rgb(58,58,60),3px_3px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60)]" style={{ borderRadius: 0 }}>
                      <Image 
                        src={`https://image.tmdb.org/t/p/w500${puzzle.filmPosterUrl}`} 
                        alt={`${puzzle.filmTitle} poster`}
                        width={200} 
                        height={300} 
                        className="block"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                  </div>
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
                {/* Share Preview */}
                <div className="bg-gradient-to-b from-gray-50 to-gray-100 border border-[#d1d2d4] p-4 text-center mb-3" style={{ borderRadius: 0 }}>
                  {(() => {
                    const shareText = (result.correct && centralizedShareText && centralizedShareText.includes("Wasn't able")) 
                      ? result.share_text 
                      : (centralizedShareText || result.share_text)
                    const lines = shareText.split('\n')
                    const firstLine = lines[0] || ''
                    const remainingLines = lines.slice(1)
                    
                    // Parse first line to extract title and emoji pattern
                    const titleMatch = firstLine.match(/^(.*?#\d+)\s+(.*)$/)
                    if (titleMatch) {
                      const gameTitle = titleMatch[1] // "Cast Climb #12"
                      const emojiPattern = titleMatch[2] // "❌❌❌✅"
                      
                      return (
                        <>
                          <p className="font-mono text-lg mb-2">{gameTitle}</p>
                          <p className="font-mono text-2xl mb-2">{emojiPattern}</p>
                          <p className="text-sm text-muted-foreground font-medium">
                            {remainingLines.join(' ')}
                          </p>
                        </>
                      )
                    }
                    
                    // Fallback if parsing fails
                    return (
                      <>
                        <p className="font-mono text-lg mb-1">{firstLine}</p>
                        {remainingLines.map((line, index) => (
                          <p key={index} className="text-sm text-muted-foreground">
                            {line}
                          </p>
                        ))}
                      </>
                    )
                  })()}
                </div>
                <ShareSection 
                  shareText={
                    // Use local share text if it indicates a win but centralized says loss
                    // This fixes the bug where winning on 4th attempt shows as loss
                    (result.correct && centralizedShareText && centralizedShareText.includes("Wasn't able")) 
                      ? result.share_text 
                      : (centralizedShareText || result.share_text)
                  }
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
      <SiteFooter />
    </div>
  )
}