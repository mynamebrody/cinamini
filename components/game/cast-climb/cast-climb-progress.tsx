"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { playClimbStep, playSuccess, playFailure, enableAudio } from "@/lib/audio-feedback"

interface CastClimbProgressProps {
  totalActors: number
  revealedIndex: number
  userGuesses: any[]
  gameCompleted: boolean
  isCorrect?: boolean
  className?: string
}

export function CastClimbProgress({
  totalActors,
  revealedIndex,
  userGuesses,
  gameCompleted,
  isCorrect = false,
  className
}: CastClimbProgressProps) {
  const [animationState, setAnimationState] = useState<number>(-1)

  // Trigger animations when revealed index changes
  useEffect(() => {
    if (revealedIndex >= 0) {
      // Add haptic feedback on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50) // Short vibration for climbing up
      }
      
      // Play climbing step sound
      playClimbStep(revealedIndex, totalActors)
      
      // Small delay to allow for smooth transitions
      const timer = setTimeout(() => {
        setAnimationState(revealedIndex)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [revealedIndex, totalActors])
  
  // Add celebration effect when game completes
  useEffect(() => {
    if (gameCompleted) {
      if (isCorrect) {
        // Victory effects
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 200])
        }
        playSuccess()
      } else {
        // Failure effects
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
        playFailure()
      }
    }
  }, [gameCompleted, isCorrect])
  
  // Enable audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      enableAudio()
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
    
    document.addEventListener('click', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)
    
    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  const getStepState = (index: number) => {
    if (gameCompleted && isCorrect && userGuesses.length > 0) {
      // Show the winning pattern
      if (index < userGuesses.length - 1) {
        return "incorrect" // Failed attempts
      } else if (index === userGuesses.length - 1) {
        return "correct" // Winning attempt
      } else {
        return "empty" // Unused attempts
      }
    } else if (gameCompleted && !isCorrect) {
      // Show all attempts as failed
      if (index < userGuesses.length) {
        return "incorrect"
      } else {
        return "empty"
      }
    } else {
      // Game in progress
      if (index < revealedIndex) {
        return "revealed" // Past attempts (revealed actors)
      } else if (index === revealedIndex) {
        return "current" // Current actor being shown
      } else {
        return "empty" // Future actors
      }
    }
  }

  const getRungLabel = (index: number) => {
    if (index === 0) return "Supporting Cast"
    if (index === totalActors - 1) return "Lead Actor"
    if (index === totalActors - 2 && totalActors > 2) return "Main Cast"
    return `Actor ${index + 1}`
  }

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-muted-foreground mb-1">🧗 Cast Climb Progress</h3>
        <div className="text-xs text-muted-foreground">
          {gameCompleted ? (
            isCorrect ? (
              <span className="text-green-600 font-medium animate-bounce">🎉 Summit Reached!</span>
            ) : (
              <span className="text-red-600 font-medium">⛰️ Climb Ended</span>
            )
          ) : (
            <span className="text-orange-600 font-medium">
              Ascending... {revealedIndex + 1} of {totalActors} actors revealed
            </span>
          )}
        </div>
      </div>
      
      <div className="relative flex flex-col-reverse space-y-reverse space-y-2 px-2">
        {Array.from({ length: totalActors }).map((_, index) => {
          const stepState = getStepState(index)
          const isAnimating = animationState === index
          
          return (
            <div key={index} className="flex items-center space-x-2 sm:space-x-3">
              {/* Actor Level Label */}
              <div className="w-16 sm:w-20 text-right">
                <div className="text-xs font-medium text-muted-foreground leading-tight">
                  {getRungLabel(index)}
                </div>
              </div>
              
              {/* Climbing Rung */}
              <div className="flex-1 relative">
                <div 
                  className={cn(
                    "h-8 rounded-lg border-2 transition-all duration-700 ease-out relative overflow-hidden",
                    {
                      // Empty state
                      "bg-muted/30 border-muted": stepState === "empty",
                      
                      // Current actor being revealed - Deep Cinema Red theme
                      "bg-gradient-to-r from-red-200 to-red-300 border-red-500 shadow-lg animate-pulse": 
                        stepState === "current",
                      
                      // Previously revealed actors (game in progress) - Cinema theme
                      "bg-gradient-to-r from-red-300 to-red-400 border-red-600": 
                        stepState === "revealed",
                      
                      // Incorrect guesses
                      "bg-gradient-to-r from-red-200 to-red-300 border-red-400": 
                        stepState === "incorrect",
                      
                      // Correct guess (winning)
                      "bg-gradient-to-r from-green-300 to-green-400 border-green-500 shadow-lg": 
                        stepState === "correct",
                    }
                  )}
                >
                  {/* Animated fill effect */}
                  {(stepState === "current" || stepState === "revealed" || stepState === "correct") && (
                    <div 
                      className={cn(
                        "absolute inset-0 bg-gradient-to-r transition-all duration-1000 ease-out transform",
                        {
                          "from-red-400 to-red-500": stepState === "current" || stepState === "revealed",
                          "from-green-400 to-green-500": stepState === "correct",
                        },
                        isAnimating ? "translate-x-0" : "-translate-x-full"
                      )}
                      style={{
                        transitionDelay: isAnimating ? "200ms" : "0ms"
                      }}
                    />
                  )}
                  
                  {/* Shimmer effect for current */}
                  {stepState === "current" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  )}
                  
                  {/* Status icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                      "transition-all duration-300",
                      stepState === "current" ? "text-lg animate-pulse" : "text-base"
                    )}>
                      {stepState === "correct" && "✅"}
                      {stepState === "incorrect" && "❌"}
                      {stepState === "current" && "🎭"}
                      {stepState === "revealed" && "👍"}
                      {stepState === "empty" && "🔲"}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Position indicator */}
              <div className="w-6 sm:w-8 text-center">
                <div className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-500",
                  {
                    "bg-muted border-muted-foreground/30 text-muted-foreground": stepState === "empty",
                    "bg-red-600 border-red-700 text-white shadow-lg animate-bounce": stepState === "current",
                    "bg-red-500 border-red-600 text-white": stepState === "revealed", 
                    "bg-red-500 border-red-600 text-white": stepState === "incorrect",
                    "bg-green-500 border-green-600 text-white animate-pulse": stepState === "correct",
                  }
                )}>
                  <span className="text-[10px] sm:text-xs">{index + 1}</span>
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Climbing indicator arrow */}
        {!gameCompleted && (
          <div className="absolute -right-8 sm:-right-12 flex items-center" 
               style={{ top: `${(totalActors - revealedIndex - 1) * 40 + 12}px` }}>
            <div className="text-red-600 animate-bounce text-sm sm:text-base">
              ➡️
            </div>
          </div>
        )}
      </div>
      
      {/* Progress summary */}
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <div className="text-sm font-medium">
          {gameCompleted ? (
            isCorrect ? (
              <span className="text-green-600">
                🏆 Climbed to victory in {userGuesses.length} attempt{userGuesses.length !== 1 ? 's' : ''}!
              </span>
            ) : (
              <span className="text-red-600">
                ⛰️ Climb ended after {userGuesses.length} attempt{userGuesses.length !== 1 ? 's' : ''}
              </span>
            )
          ) : (
            <span className="text-red-600">
              🎬 Currently at Actor {revealedIndex + 1} of {totalActors}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Add custom shimmer animation to globals.css or use inline styles
const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`