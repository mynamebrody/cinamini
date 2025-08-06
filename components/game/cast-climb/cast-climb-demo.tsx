"use client"

import { useState, useEffect } from "react"
import { CastClimbProgress } from "./cast-climb-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Demo component to showcase the climbing progress animation
export function CastClimbDemo() {
  const [revealedIndex, setRevealedIndex] = useState(0)
  const [userGuesses, setUserGuesses] = useState<any[]>([])
  const [gameCompleted, setGameCompleted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const totalActors = 4

  const startDemo = () => {
    setRevealedIndex(0)
    setUserGuesses([])
    setGameCompleted(false)
    setIsCorrect(false)
    setIsPlaying(true)
  }

  const nextActor = () => {
    if (revealedIndex < totalActors - 1) {
      // Add a wrong guess
      const newGuess = {
        id: Date.now(),
        guessFilmTitle: `Wrong Guess ${revealedIndex + 1}`,
        isCorrect: false,
        actorsRevealed: revealedIndex + 1
      }
      setUserGuesses(prev => [...prev, newGuess])
      setRevealedIndex(prev => prev + 1)
    }
  }

  const winGame = () => {
    // Add a correct guess
    const correctGuess = {
      id: Date.now(),
      guessFilmTitle: "Correct Movie!",
      isCorrect: true,
      actorsRevealed: revealedIndex + 1
    }
    setUserGuesses(prev => [...prev, correctGuess])
    setGameCompleted(true)
    setIsCorrect(true)
    setIsPlaying(false)
  }

  const loseGame = () => {
    // Fill remaining guesses as wrong
    const remainingGuesses = []
    for (let i = userGuesses.length; i < totalActors; i++) {
      remainingGuesses.push({
        id: Date.now() + i,
        guessFilmTitle: `Wrong Guess ${i + 1}`,
        isCorrect: false,
        actorsRevealed: i + 1
      })
    }
    setUserGuesses(prev => [...prev, ...remainingGuesses])
    setGameCompleted(true)
    setIsCorrect(false)
    setIsPlaying(false)
  }

  const reset = () => {
    setRevealedIndex(0)
    setUserGuesses([])
    setGameCompleted(false)
    setIsCorrect(false)
    setIsPlaying(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🎭 Cast Climb Progress Demo</CardTitle>
          <p className="text-muted-foreground">
            Interactive demo of the LinkedIn Pinpoint-inspired climbing visualization
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demo Progress */}
            <div>
              <CastClimbProgress
                totalActors={totalActors}
                revealedIndex={revealedIndex}
                userGuesses={userGuesses}
                gameCompleted={gameCompleted}
                isCorrect={isCorrect}
              />
            </div>
            
            {/* Demo Controls */}
            <div className="space-y-4">
              <h3 className="font-semibold">Demo Controls</h3>
              
              {!isPlaying && !gameCompleted && (
                <Button onClick={startDemo} className="w-full">
                  Start Demo Climb
                </Button>
              )}
              
              {isPlaying && (
                <div className="space-y-2">
                  <Button 
                    onClick={nextActor} 
                    variant="outline" 
                    className="w-full"
                    disabled={revealedIndex >= totalActors - 1}
                  >
                    Wrong Guess → Next Actor ({revealedIndex + 1}/{totalActors})
                  </Button>
                  
                  <Button 
                    onClick={winGame} 
                    variant="default" 
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    🎉 Correct Guess → Win!
                  </Button>
                  
                  <Button 
                    onClick={loseGame} 
                    variant="destructive" 
                    className="w-full"
                  >
                    💔 Give Up → Lose
                  </Button>
                </div>
              )}
              
              {gameCompleted && (
                <div className="space-y-2">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-lg font-semibold">
                      {isCorrect ? "🏆 Summit Reached!" : "⛰️ Climb Failed"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {userGuesses.length} attempt{userGuesses.length !== 1 ? 's' : ''} made
                    </div>
                  </div>
                  
                  <Button onClick={reset} variant="outline" className="w-full">
                    🔄 Reset Demo
                  </Button>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Features Demonstrated:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Progressive climbing visualization</li>
                  <li>Gradient color animations</li>
                  <li>Smooth state transitions</li>
                  <li>Mobile-responsive design</li>
                  <li>Haptic feedback (on supported devices)</li>
                  <li>Celebration animations</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}