"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CastClimbProgressProps {
  totalActors: number
  revealedIndex: number
  userGuesses?: any[]
  gameCompleted: boolean
  isCorrect?: boolean
  className?: string
  actors?: { name: string; character: string }[]
}

export function CastClimbProgress({
  totalActors,
  revealedIndex,
  userGuesses = [],
  gameCompleted,
  isCorrect = false,
  className,
  actors = []
}: CastClimbProgressProps) {
  const [animationState, setAnimationState] = useState<number>(-1)

  // Trigger animations when revealed index changes
  useEffect(() => {
    if (revealedIndex >= 0) {
      // Add haptic feedback on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50) // Short vibration for climbing up
      }
      
      
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
      } else {
        // Failure effects
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
      }
    }
  }, [gameCompleted, isCorrect])
  

  const getStepState = (index: number) => {
    if (gameCompleted) {
      // When game is completed, always show as "completed" to display actor names
      return "completed"
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

  const getNumberState = (index: number) => {
    if (gameCompleted && userGuesses && userGuesses.length > 0) {
      if (index < userGuesses.length - 1) {
        return "incorrect" // Failed attempts - show ❌
      } else if (index === userGuesses.length - 1 && isCorrect) {
        return "correct" // Winning attempt - show ✅
      } else if (index === userGuesses.length - 1 && !isCorrect) {
        return "incorrect" // Final failed attempt - show ❌
      } else {
        return "unused" // Never attempted - show number
      }
    } else if (gameCompleted && (!userGuesses || userGuesses.length === 0)) {
      return "unused" // No attempts made - show numbers
    } else {
      // Game in progress - use same logic as before
      if (index < revealedIndex) {
        return "revealed"
      } else if (index === revealedIndex) {
        return "current"
      } else {
        return "empty"
      }
    }
  }

  const getRungLabel = (index: number) => {
    if (index === 0) return "Supporting Cast"
    if (index === totalActors - 1) return "Lead Actor"
    if (index === totalActors - 2 || index === totalActors - 3) return "Main Cast"
    return `Actor ${index + 1}`
  }

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-muted-foreground mb-1">Cast Climb Progress</h3>
        <div className="text-xs text-muted-foreground">
          {gameCompleted ? (
            isCorrect ? (
              <span className="text-green-600 font-medium animate-bounce">🎉 Summit Reached!</span>
            ) : (
              <span className="text-cinema-red font-medium">⛰️ Climb Ended</span>
            )
          ) : (
            <span className="text-cinema-red font-medium">
              🎬 Currently at Actor {revealedIndex + 1} of {totalActors}
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
                    "h-8 border transition-all duration-700 ease-out relative overflow-hidden shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)]",
                    {
                      // Empty state
                      "bg-muted/30 border-muted": stepState === "empty",
                      
                      // Current actor being revealed - Deep Cinema Red theme
                      "bg-gradient-to-r from-red-200 to-red-300 border-red-500 animate-pulse": 
                        stepState === "current",
                      
                      // Previously revealed actors (game in progress) - Cinema theme
                      "bg-gradient-to-r from-red-300 to-red-400 border-cinema-red": 
                        stepState === "revealed",
                      
                      // Incorrect guesses
                      "bg-gradient-to-r from-red-200 to-red-300 border-red-400": 
                        stepState === "incorrect",
                      
                      // Correct guess (winning)
                      "bg-gradient-to-r from-green-300 to-green-400 border-green-500": 
                        stepState === "correct",
                    }
                  )}
                  style={{ borderRadius: 0 }}
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
                  <div className="absolute inset-0 flex items-center justify-center px-2">
                    {(stepState === "current" || stepState === "revealed" || stepState === "completed") && actors[index] && (
                      <span className={cn(
                        "font-semibold text-xs text-center leading-tight transition-all duration-300 text-gray-900",
                        stepState === "current" ? "animate-pulse" : ""
                      )}>
                        {actors[index].name}
                      </span>
                    )}
                    {stepState === "empty" && <span className="text-base">🎭</span>}
                  </div>
                </div>
              </div>
              
              {/* Position indicator */}
              <div className="w-6 sm:w-8 text-center">
                <div className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 border flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)]",
                  (() => {
                    const numberState = getNumberState(index)
                    return {
                      // Empty state - silver 3D shadows
                      "bg-muted border-muted-foreground/30 text-muted-foreground shadow-[1px_1px_0px_rgb(var(--border)),2px_2px_0px_rgb(var(--border))]": numberState === "empty",
                      
                      // States with actor names - charcoal shadows
                      "bg-charcoal border-charcoal text-white animate-bounce shadow-[1px_1px_0px_rgb(var(--charcoal)),2px_2px_0px_rgb(var(--charcoal))]": numberState === "current",
                      "bg-charcoal border-charcoal text-white shadow-[1px_1px_0px_rgb(var(--charcoal)),2px_2px_0px_rgb(var(--charcoal))]": numberState === "revealed", 
                      
                      // Failed attempts - red background
                      "bg-red-500 border-red-600 text-white shadow-[1px_1px_0px_rgb(239,68,68),2px_2px_0px_rgb(239,68,68)]": numberState === "incorrect",
                      
                      // Correct guess - green 3D shadows
                      "bg-green-500 border-green-600 text-white animate-pulse shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94)]": numberState === "correct",
                      
                      // Unused attempts - charcoal but show number
                      "bg-charcoal border-charcoal text-white shadow-[1px_1px_0px_rgb(var(--charcoal)),2px_2px_0px_rgb(var(--charcoal))]": numberState === "unused",
                    }
                  })()
                )}
                style={{ borderRadius: 0 }}
                >
                  {(() => {
                    const numberState = getNumberState(index)
                    if (numberState === "incorrect") {
                      return <span className="text-sm">❌</span>
                    } else if (numberState === "correct") {
                      return <span className="text-sm">✅</span>
                    } else {
                      return <span className="text-[10px] sm:text-xs">{index + 1}</span>
                    }
                  })()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Progress summary */}
      <div className="bg-muted/50 p-3 text-center" style={{ borderRadius: 0 }}>
        <div className="text-sm font-medium">
          {gameCompleted ? (
            isCorrect ? (
              <span className="text-green-600">
                🏆 Climbed to victory in {userGuesses?.length || 0} attempt{(userGuesses?.length || 0) !== 1 ? 's' : ''}!
              </span>
            ) : (
              <span className="text-cinema-red">
                ⛰️ Climb ended after {userGuesses?.length || 0} attempt{(userGuesses?.length || 0) !== 1 ? 's' : ''}
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

