"use client"

/**
 * Example Integration Component
 * 
 * This demonstrates how each game can easily integrate with the unified
 * achievement and celebration system while maintaining their unique personality.
 * 
 * Usage in game components:
 * 1. Import the hooks and components you need
 * 2. Report game events as they happen
 * 3. Let the system handle celebrations and notifications automatically
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GameTheme } from "@/lib/universal-achievements"
import { useGameAchievements } from "./achievement-system"
import { useCelebration, QuickSuccessCelebration, EpicAchievementCelebration } from "./celebration-effects-library"
import { UniversalConfetti } from "./universal-confetti"
import { AchievementBadge } from "./achievement-badge"

// Example game component showing integration patterns
export function GameIntegrationExample({ gameTheme }: { gameTheme: GameTheme }) {
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing')
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationType, setCelebrationType] = useState<'quick' | 'epic'>('quick')
  
  // Get game-specific achievement hooks
  const {
    gameAchievements,
    reportGameCompleted,
    reportPerfectScore,
    reportMovieEncountered
  } = useGameAchievements(gameTheme)
  
  // Get celebration utilities
  const { celebrate } = useCelebration()

  // Example: Handle game completion
  const handleGameWon = async (isPerfect: boolean) => {
    setGameState('won')
    
    // Report to achievement system
    const newAchievements = await reportGameCompleted({
      isPerfect,
      completionTime: Date.now(),
      difficulty: 'normal'
    })
    
    // Report perfect score separately if applicable
    if (isPerfect) {
      await reportPerfectScore({
        completionTime: Date.now()
      })
    }
    
    // Trigger appropriate celebration
    if (isPerfect || newAchievements.length > 0) {
      setCelebrationType('epic')
    } else {
      setCelebrationType('quick')
    }
    
    setShowCelebration(true)
  }

  // Example: Handle movie encounter (for tracking exploration achievements)
  const handleMovieEncountered = async (movieId: number) => {
    await reportMovieEncountered(movieId)
  }


  return (
    <div className="relative min-h-screen bg-gray-900 p-4">
      {/* Game Header with Achievement Progress */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">
          {gameTheme.charAt(0).toUpperCase() + gameTheme.slice(1)} Game
        </h1>
        
        {/* Show recent game achievements */}
        <div className="flex gap-2">
          {gameAchievements.slice(0, 3).map(achievement => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              size="small"
              showProgress={!achievement.unlocked}
            />
          ))}
        </div>
      </div>

      {/* Example Game Content */}
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <h2 className="text-xl text-white mb-6">Game Content Goes Here</h2>
        
        {gameState === 'playing' && (
          <div className="space-y-4">
            <p className="text-gray-300">This is where your game logic would be...</p>
            
            {/* Example game actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleGameWon(false)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
              >
                Win Game (Normal)
              </button>
              
              <button
                onClick={() => handleGameWon(true)}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white transition-colors"
              >
                Win Game (Perfect!)
              </button>
              
              <button
                onClick={handleSpecialMoment}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
              >
                Special Moment
              </button>
            </div>
            
            {/* Example movie encounter */}
            <button
              onClick={() => handleMovieEncountered(Math.floor(Math.random() * 1000))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Encounter Random Movie
            </button>
          </div>
        )}
        
        {gameState === 'won' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-400"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold">You Won!</h3>
            <p className="text-gray-300 mt-2">Check your achievements!</p>
            
            <button
              onClick={() => {
                setGameState('playing')
                setShowCelebration(false)
              }}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </div>

      {/* Celebration Components */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {celebrationType === 'quick' ? (
              <QuickSuccessCelebration
                gameTheme={gameTheme}
                show={showCelebration}
                onComplete={() => setShowCelebration(false)}
              />
            ) : (
              <EpicAchievementCelebration
                gameTheme={gameTheme}
                tier="gold"
                show={showCelebration}
                onComplete={() => setShowCelebration(false)}
              />
            )}
          </>
        )}
      </AnimatePresence>

      {/* Achievement Progress Indicator */}
      <div className="fixed bottom-4 left-4">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Game Progress</p>
          <div className="flex gap-1">
            {gameAchievements.slice(0, 5).map(achievement => {
              const progress = achievement.maxProgress > 1 
                ? (achievement.progress / achievement.maxProgress) * 100 
                : achievement.unlocked ? 100 : 0
              
              return (
                <div
                  key={achievement.id}
                  className="w-2 h-8 bg-gray-700 rounded-full overflow-hidden"
                >
                  <div
                    className="bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 rounded-full"
                    style={{ height: `${progress}%` }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Integration Guide for Existing Games
 * 
 * 1. CAST CLIMB INTEGRATION:
 * ```tsx
 * import { useGameAchievements } from '@/components/universal/achievement-system'
 * import { useCelebration } from '@/components/universal/celebration-effects-library'
 * 
 * const { reportGameCompleted, reportPerfectScore } = useGameAchievements('cast-climb')
 * const { celebrate } = useCelebration()
 * 
 * // When user guesses correctly on first actor:
 * if (guessNumber === 1 && isCorrect) {
 *   await reportPerfectScore({ firstGuess: true })
 *   celebrate('cast-climb', 'gold')
 * }
 * ```
 * 
 * 2. RETITLED INTEGRATION:
 * ```tsx
 * const { reportGameCompleted, reportMovieEncountered } = useGameAchievements('retitled')
 * 
 * // When game completed:
 * await reportGameCompleted({ 
 *   country: puzzle.country_code,
 *   isCorrect: userGuess === correctAnswer 
 * })
 * 
 * // Track country visits for exploration achievements:
 * await reportMovieEncountered(puzzle.film_id)
 * ```
 * 
 * 3. BUDGET BRACKET INTEGRATION:
 * ```tsx
 * const { reportGameCompleted, reportPerfectScore } = useGameAchievements('budget-bracket')
 * 
 * // When perfect game (all 5 rounds correct):
 * if (correctRounds === 5) {
 *   await reportPerfectScore({ perfectRounds: 5 })
 * }
 * 
 * // Track total budget amounts for milestone achievements:
 * await updateProgress({
 *   gameTheme: 'budget-bracket',
 *   action: 'budget_estimated',
 *   value: totalBudgetAmount
 * })
 * ```
 * 
 * 4. POSTER PIXELS INTEGRATION:
 * ```tsx
 * const { reportGameCompleted, reportPerfectScore } = useGameAchievements('poster-pixels')
 * 
 * // When solved at maximum blur (perfect restoration):
 * if (clarityLevel <= 0.3 && isCorrect) {
 *   await reportPerfectScore({ maxBlur: true, clarity: clarityLevel })
 * }
 * ```
 */

// Utility component for easy celebration testing
export function CelebrationTester() {
  const { celebrate } = useCelebration()
  const [activeConfetti, setActiveConfetti] = useState<GameTheme | null>(null)

  const testCelebration = (gameTheme: GameTheme) => {
    celebrate(gameTheme, 'gold')
    setActiveConfetti(gameTheme)
    
    setTimeout(() => setActiveConfetti(null), 3000)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {(['cast-climb', 'retitled', 'budget-bracket', 'poster-pixels'] as GameTheme[]).map(theme => (
        <button
          key={theme}
          onClick={() => testCelebration(theme)}
          className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
        >
          Test {theme.charAt(0).toUpperCase() + theme.slice(1)} Celebration
        </button>
      ))}
      
      {activeConfetti && (
        <UniversalConfetti
          show={true}
          gameTheme={activeConfetti}
          intensity="heavy"
          duration={3000}
          onComplete={() => setActiveConfetti(null)}
        />
      )}
    </div>
  )
}
