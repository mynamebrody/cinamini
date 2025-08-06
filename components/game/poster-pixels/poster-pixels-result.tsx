"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Trophy, Clock, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface PosterPixelsResultProps {
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
}

export default function PosterPixelsResult({ 
  puzzleNumber,
  won, 
  timeElapsed, 
  clarityLevel, 
  movieTitle, 
  movieYear,
  moviePosterUrl,
  guesses 
}: PosterPixelsResultProps) {
  const formatTime = (seconds: number) => {
    const secs = Math.floor(seconds)
    return `${secs}s`
  }

  const formatClarity = (clarity: number) => {
    return `${Math.round(clarity * 100)}%`
  }

  const generateShareText = () => {
    const result = won ? "✅" : "❌"
    const clarity = formatClarity(clarityLevel)
    const time = formatTime(timeElapsed)
    
    // Check if time ran out (game duration is 30 seconds)
    const ranOutOfTime = !won && timeElapsed >= 29.5 // Allow small margin for timing
    
    if (ranOutOfTime) {
      return `Poster Pixels #${puzzleNumber} ${result}\nRan out of time!`
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
              shareText={generateShareText()}
              shareUrl="https://cinamini.app"
            />
          </div>
        </CardContent>
      </Card>

      {/* Guess Breakdown */}
      {guesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Guess</CardTitle>
          </CardHeader>
          <CardContent>
            {guesses.map((guess, index) => (
              <div key={index} className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                guess.isCorrect 
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              )}>
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
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-muted-foreground text-sm">
        Come back tomorrow for a new puzzle!
      </p>
    </div>
  )
}