"use client"

import { useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Trophy, Clock, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { usePosterPixelsShare } from "@/hooks/useGameShare"
import type { PosterPixelsShareData } from "@/lib/sharing"

interface PosterPixelsResultProps {
  puzzleId: string
  puzzleNumber: number
  won: boolean
  timeElapsed: number
  clarityLevel: number
  movieTitle: string
  movieYear: string
  moviePosterUrl?: string
  guesses: Array<{
    movieId: number
    movieTitle: string
    isCorrect: boolean
    clarityLevel: number
  }>
  timedOut?: boolean
  finalScore?: number
}

export default function PosterPixelsResult({ 
  puzzleId,
  puzzleNumber,
  won, 
  timeElapsed, 
  clarityLevel, 
  movieTitle, 
  movieYear,
  moviePosterUrl,
  guesses,
  timedOut = false,
  finalScore = 0
}: PosterPixelsResultProps) {
  const formatTime = (seconds: number) => {
    const secs = Math.floor(seconds)
    return `${secs}s`
  }

  const formatClarity = (clarity: number) => {
    return `${Math.round(clarity * 100)}%`
  }

  // Use centralized sharing system - memoize to prevent infinite re-renders
  const shareData: PosterPixelsShareData = useMemo(() => ({
    attempts: guesses.map((guess, index) => ({
      guessMovieId: guess.movieId,
      guessMovieTitle: guess.movieTitle,
      isCorrect: guess.isCorrect,
      clarityLevel: guess.clarityLevel,
      solveTimeMs: timeElapsed * 1000 // Convert to milliseconds
    })),
    puzzle: {
      puzzleNumber
    },
    result: {
      isWin: won,
      finalScore,
      timedOut
    }
  }), [guesses, puzzleNumber, won, finalScore, timedOut, timeElapsed])
  
  const { shareText: centralizedShareText, fetchShare, isLoading: isShareLoading } = usePosterPixelsShare(puzzleId)
  
  // Generate share text on mount
  useEffect(() => {
    fetchShare().catch((error) => {
      console.log('Centralized sharing failed for Poster Pixels:', error)
      // Fallback handled by using generateFallbackShareText()
    })
  }, [fetchShare])
  
  // Fallback share text function for loading states or errors
  function generateFallbackShareText(): string {
    const result = won ? "✅" : "❌"
    const clarity = formatClarity(clarityLevel)
    const time = formatTime(timeElapsed)
    
    // Check if time ran out (game duration is 30 seconds)
    const ranOutOfTime = timedOut || (!won && timeElapsed >= 29.5) // Allow small margin for timing
    
    if (ranOutOfTime) {
      return `Poster Pixels #${puzzleNumber} ${result}\nRan out of time! ⌛`
    }
    
    if (won) {
      return `Poster Pixels #${puzzleNumber} ${result}\nGuessed at ${clarity} clarity in ${time} 🖼️`
    }
    
    return `Poster Pixels #${puzzleNumber} ${result}\nGuessed at ${clarity} clarity in ${time}`
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Result Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {won ? (
              <>
                <Trophy className="w-6 h-6 text-yellow-500" />
                Correct!
              </>
            ) : (
              <>
                <X className="w-6 h-6 text-red-500" />
                Game Over
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Movie Poster */}
          {moviePosterUrl && (
            <div className="flex justify-center mb-4">
              <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={moviePosterUrl}
                  alt={`${movieTitle} poster`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 192px, 192px"
                />
              </div>
            </div>
          )}
          
          {/* Movie Details */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {movieTitle} ({movieYear})
            </h3>
            <p className="text-muted-foreground">
              {won ? "You identified the movie correctly!" : "Better luck next time!"}
            </p>
          </div>

          {/* Your Guess Section - Always show */}
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-center">Your Guess</h4>
            {guesses.length > 0 ? (
              guesses.map((guess, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center justify-between p-3 bg-white border",
                    guess.isCorrect 
                      ? "border-green-500 shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94),3px_3px_0px_rgb(34,197,94),4px_4px_0px_rgb(34,197,94)]"
                      : "border-red-300 shadow-[1px_1px_0px_rgb(252,165,165),2px_2px_0px_rgb(252,165,165),3px_3px_0px_rgb(252,165,165),4px_4px_0px_rgb(252,165,165)]"
                  )}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-3">
                    {guess.isCorrect ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{guess.movieTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        At {formatClarity(guess.clarityLevel)} clarity
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 text-center text-muted-foreground" style={{ borderRadius: 0 }}>
                No guess recorded
              </div>
            )}
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-border">
            <div>
              <div className="text-2xl font-bold">{formatClarity(clarityLevel)}</div>
              <div className="text-sm text-muted-foreground">Clarity</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{won ? "1" : "0"}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
          </div>

          {/* Share Section */}
          <div className="border-t pt-4">
            <div className="text-center mb-3">
              <div className="text-lg font-mono tracking-wider mb-2">
                Poster Pixels #{puzzleNumber} {won ? "✅" : "❌"}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatClarity(clarityLevel)} clarity • {formatTime(timeElapsed)}
              </div>
            </div>
            
            <ShareSection 
              shareText={centralizedShareText || generateFallbackShareText()}
              shareUrl="https://www.cinamini.app/game/poster-pixels"
            />
          </div>
        </CardContent>
      </Card>


      <p className="text-center text-muted-foreground text-sm">
        Come back tomorrow for a new puzzle!
      </p>
    </div>
  )
}