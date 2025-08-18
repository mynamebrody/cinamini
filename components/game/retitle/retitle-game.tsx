"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useGameMode } from "@/hooks/use-game-mode"
import { hasTutorialBeenViewed, setTutorialViewed } from "@/lib/game-tutorial-cookies"
import AnonymousResultNudge from "../anonymous-result-nudge"
import { MorePuzzlesSection } from "../more-puzzles-section"
import RetitlePuzzle from "./retitle-puzzle"
import RetitleResult from "./retitle-result"
import RetitleStats from "./retitle-stats"
import RetitledGlobeProgress from "./retitled-globe-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { GameHeader } from "../game-header"
import { GameLanding } from "../game-landing"
import { InstructionCard, InstructionGrid } from "../instruction-card"
import { GameModal, GameModalHeader, GameModalTitle, GameModalBody } from "../game-modal"

interface PuzzleData {
  id: string
  puzzleDate: string
  puzzleNumber: number
  localizedTitle: string
  englishTranslation: string
  countryCode: string
  countryName: string
  flagEmoji: string
  options: Array<{ id: number; title: string }>
}

interface GuessResult {
  correct: boolean
  correctAnswer: {
    id: number
    title: string
    originalTitle: string
    releaseYear: string
    translationNote: string
  }
  stats: {
    gamesPlayed: number
    accuracy: number
    currentStreak: number
  }
}

type GameState = 'loading' | 'ready' | 'playing' | 'completed' | 'error'
type ModalState = 'none' | 'howtoplay' | 'stats'

export default function RetitleGame() {
  const { user, isAnonymous, loading: authLoading } = useGameMode()
  const [gameState, setGameState] = useState<GameState>('loading')
  const [modalState, setModalState] = useState<ModalState>('none')
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [solveTimeMs, setSolveTimeMs] = useState<number>(0)
  const [result, setResult] = useState<GuessResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visitedCountries, setVisitedCountries] = useState<string[]>([])
  const [travelState, setTravelState] = useState<'preparing' | 'traveling' | 'arrived' | 'celebrating'>('preparing')

  useEffect(() => {
    if (!authLoading) {
      loadTodaysPuzzle()
    }
  }, [authLoading])

  // Load visited countries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('retitled-visited-countries')
    if (saved) {
      try {
        setVisitedCountries(JSON.parse(saved))
      } catch (err) {
        console.warn('Failed to parse visited countries:', err)
      }
    }
  }, [])

  const loadTodaysPuzzle = async () => {
    try {
      setGameState('loading')
      setError(null)
      
      const response = await fetch("/api/retitled/puzzle/today")
      if (!response.ok) {
        throw new Error("Failed to load puzzle")
      }
      
      const data = await response.json()
      
      // Check if already played today
      if (user) {
        // Handle authenticated user states
        if (data.hasPlayed) {
        // User has already played today, show the result
        setPuzzle(data.puzzle) // Set puzzle data for the result display
        
        // Try the result API first for full result data
        const resultResponse = await fetch(`/api/retitled/result/${data.puzzle.id}`)
        
        if (resultResponse.ok) {
          const resultData = await resultResponse.json()
          setResult(resultData)
        } else {
          // Fallback: use the guess data and stats API
          const statsResponse = await fetch("/api/retitled/stats")
          let statsData = null
          if (statsResponse.ok) {
            statsData = await statsResponse.json()
          }
          
          // Create result from userGuess data if available
          if (data.userGuess) {
            setResult({
              correct: data.userGuess.isCorrect,
              correctAnswer: {
                id: data.puzzle.filmId || 562, // Use puzzle data or fallback
                title: "See results for details",
                originalTitle: "See results for details",
                releaseYear: "Unknown",
                translationNote: data.puzzle.translationNote || ""
              },
              puzzle: {
                localizedTitle: data.puzzle.localizedTitle,
                countryCode: data.puzzle.countryCode,
                flagEmoji: data.puzzle.flagEmoji
              },
              stats: {
                gamesPlayed: statsData?.stats?.gamesPlayed || 0,
                accuracy: statsData?.stats?.accuracy || 0,
                currentStreak: statsData?.stats?.currentStreak || 0
              }
            })
          } else {
            // No guess data available, but user has played - try to get result another way
            console.warn("User has played but no guess data available")
            setResult({
              correct: false,
              correctAnswer: {
                id: data.puzzle.filmId || 562,
                title: "Result data unavailable",
                originalTitle: "Result data unavailable",
                releaseYear: "Unknown",
                translationNote: ""
              },
              puzzle: {
                localizedTitle: data.puzzle.localizedTitle,
                countryCode: data.puzzle.countryCode,
                flagEmoji: data.puzzle.flagEmoji
              },
              stats: {
                gamesPlayed: statsData?.stats?.gamesPlayed || 0,
                accuracy: statsData?.stats?.accuracy || 0,
                currentStreak: statsData?.stats?.currentStreak || 0
              }
            })
          }
          }
          setGameState('completed')
        } else {
          // User hasn't played today
          setPuzzle(data.puzzle)
          setGameState('ready')
          
          // Show how-to-play modal only if they've never seen the tutorial
          const hasSeenTutorial = hasTutorialBeenViewed('retitled')
          if (!hasSeenTutorial) {
            setModalState('howtoplay')
          }
        }
      } else {
        // Anonymous user
        setPuzzle(data.puzzle)
        setGameState('ready')
        
        // Check if this is the user's first time playing
        const hasSeenTutorial = hasTutorialBeenViewed('retitled')
        if (!hasSeenTutorial) {
          setModalState('howtoplay')
        }
      }
    } catch (err) {
      console.error("Error loading puzzle:", err)
      setError("Failed to load today's puzzle. Please try again.")
      setGameState('error')
    }
  }

  const startGame = () => {
    // Mark that the user has seen the tutorial if coming from how to play
    if (modalState === 'howtoplay') {
      setTutorialViewed('retitled')
    }
    setGameState('playing')
    setStartTime(Date.now())
    setModalState('none')
  }

  const handleGuess = async (guessFilmId: number) => {
    if (!puzzle) return

    const currentSolveTime = Date.now() - startTime
    setSolveTimeMs(currentSolveTime)

    try {
      // Submit to server for all users (anonymous and authenticated)
      const response = await fetch("/api/retitled/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          puzzleId: puzzle.id,
          guessFilmId,
          solveTimeMs: currentSolveTime
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit guess")
      }

      const data = await response.json()
      setResult(data)
      setGameState('completed')
    } catch (err) {
      console.error("Error submitting guess:", err)
      setError("Failed to submit your guess. Please try again.")
      setGameState('error')
    }
  }

  const showStats = () => {
    setModalState('stats')
  }

  const showHowToPlay = () => {
    setModalState('howtoplay')
  }

  // Don't render the game container UI if we're showing the landing page
  if (gameState === "ready" && modalState !== 'howtoplay') {
    return (
      <GameLanding
        gameId="retitled"
        gameName="Retitled"
        puzzleNumber={puzzle?.puzzleNumber}
        puzzleDate={puzzle?.puzzleDate}
        backgroundColor="#ebbb4a"
        logo="/cinamini/games/RetitledPoster.svg"
        logoPng="/cinamini/games/RetitledPoster.png"
        onStart={startGame}
        showBackButton={true}
      >
        {/* Travel preparation globe */}
        {puzzle && (
          <div className="mt-8">
            <RetitledGlobeProgress
              countryCode={puzzle.countryCode}
              countryName={puzzle.countryName}
              flagEmoji={puzzle.flagEmoji}
              gameState="preparing"
              visitedCountries={visitedCountries}
              className=""
            />
          </div>
        )}
      </GameLanding>
    )
  }

  // Render the game
  return (
    <div className="game-container">
      <GameHeader 
        title="Retitled" 
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
            setTutorialViewed('retitled')
          }
          setModalState(open ? 'howtoplay' : 'none')
        }}
        className="max-w-2xl"
        backdropColor="rgba(235, 187, 74, 0.3)"
      >
        <GameModalHeader>
          <GameModalTitle>How to Play Retitled</GameModalTitle>
        </GameModalHeader>
        <GameModalBody>
          <InstructionGrid columns={2}>
            <InstructionCard
              step={1}
              title="See the Foreign Title"
              description="You'll see a movie title translated into another language, along with the country flag to give you context."
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    <span className="text-2xl">🇪🇸</span>
                    <div className="text-muted-foreground text-sm font-medium">Spanish Title</div>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2 text-lg text-foreground font-semibold">
                    Solo en Casa
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={2}
              title="Choose the English Title"
              description="Pick the correct English movie title from 4-5 carefully selected options. Some might be tricky!"
              darkTheme={true}
              example={
                <div className="space-y-2">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm text-foreground text-center">
                    A) Home Alone
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm text-muted-foreground text-center">
                    B) House Party
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={3}
              title="One Chance Only"
              description="You get just one guess per daily puzzle, so think carefully! Consider the literal translation and cultural context."
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="text-foreground text-sm">
                    ✅ Correct!
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    One guess per day
                  </div>
                </div>
              }
            />
            <InstructionCard
              step={4}
              title="Learn & Share"
              description="Discover fascinating translation trivia and share your success (or educated guess) with friends!"
              darkTheme={true}
              example={
                <div className="text-center">
                  <div className="text-foreground text-sm font-mono">
                    Retitled #123 🌍✅
                  </div>
                </div>
              }
            />
          </InstructionGrid>
          <div className="mt-6 text-center">
            <Button onClick={() => {
              setTutorialViewed('retitled')
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
          <RetitleStats onClose={() => setModalState('none')} />
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
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={loadTodaysPuzzle} className="w-full">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ready state is now handled by the landing page above */}

        {gameState === 'playing' && puzzle && (
          <div className="max-w-4xl mx-auto">
            <RetitlePuzzle 
              puzzle={puzzle}
              onGuess={handleGuess}
              startTime={startTime}
            />
          </div>
        )}

        {gameState === 'completed' && result && (
          <div className="max-w-md mx-auto space-y-4">
            <RetitleResult 
              result={result} 
              puzzleId={puzzle?.id || ""}
              puzzleNumber={puzzle?.puzzleNumber || 0}
              solveTimeMs={solveTimeMs}
            />
            
            {/* More Puzzles Section */}
            <MorePuzzlesSection currentGameId="retitled" />
            
            {isAnonymous && (
              <AnonymousResultNudge 
                gameResult={result}
                gameName="Retitled"
                gamesPlayed={result.stats.gamesPlayed}
                currentStreak={result.stats.currentStreak}
              />
            )}
          </div>
        )}
      </main>
      
    </div>
  )
}