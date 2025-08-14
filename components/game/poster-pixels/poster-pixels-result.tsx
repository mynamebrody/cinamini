"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { POSTER_PIXELS_LEVELS } from "@/lib/poster-pixels-config"

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
    movieId: number | null
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
  const formatClarity = (clarity: number) => {
    return `${Math.round(clarity)}%`
  }

  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Calculate actual number of attempts before winning (wrong guesses + skips)
  const calculateAttemptsBeforeWin = () => {
    if (won) {
      // For wins, count all attempts (wrong guesses + skips) except the final correct one
      return Math.max(0, guesses.length - 1)
    } else {
      // For losses, count all skips (should be 4 for the standard 🔍🔍🔍🔍❌ format)
      return 4
    }
  }

  const attemptsUsed = calculateAttemptsBeforeWin()

  // Direct share text generation without centralized system
  
  // Generate the new format: 🔍🔍🔍✅👾 (magnifying glasses + result + remaining aliens)
  function generateResultEmojis(): string {
    const magnifyingGlasses = "🔍".repeat(attemptsUsed)
    
    if (won) {
      // If won, show result and remaining aliens (5 total - attempts used - 1 for result)
      const remainingAliens = "👾".repeat(Math.max(0, 5 - attemptsUsed - 1))
      return `${magnifyingGlasses}✅${remainingAliens}`
    } else {
      // If lost/gave up, show 4 magnifying glasses and one X (always 5 total)
      return "🔍🔍🔍🔍❌"
    }
  }

  // Generate bonus text for special achievements
  function generateBonusText(): string {
    if (!won) return ""
    
    const clarity = Math.round(clarityLevel)
    let bonus = `Guess with ${clarity}% clarity`
    
    if (attemptsUsed === 0) {
      bonus = `First guess! ${bonus}`
    }
    
    return bonus
  }

  // Fallback share text function for loading states or errors
  function generateFallbackShareText(): string {
    const resultEmojis = generateResultEmojis()
    const bonusText = generateBonusText()
    const score = won ? finalScore : 0
    const timeText = formatTime(timeElapsed)
    
    let shareText = `Poster Pixels #${puzzleNumber} ${resultEmojis}`
    
    if (bonusText) {
      shareText += `\n${bonusText}`
    }
    
    shareText += `\n${timeText} • ${score} pts`
    
    // Add "I gave up!" if the user didn't win
    if (!won) {
      shareText += `\nI gave up!`
    }
    
    return shareText
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
                      : guess.movieTitle === 'Gave Up' 
                        ? "border-orange-400 shadow-[1px_1px_0px_rgb(251,146,60),2px_2px_0px_rgb(251,146,60),3px_3px_0px_rgb(251,146,60),4px_4px_0px_rgb(251,146,60)]"
                        : guess.movieTitle === 'Skipped'
                          ? "border-gray-400 shadow-[1px_1px_0px_rgb(156,163,175),2px_2px_0px_rgb(156,163,175),3px_3px_0px_rgb(156,163,175),4px_4px_0px_rgb(156,163,175)]"
                          : "border-red-300 shadow-[1px_1px_0px_rgb(252,165,165),2px_2px_0px_rgb(252,165,165),3px_3px_0px_rgb(252,165,165),4px_4px_0px_rgb(252,165,165)]"
                  )}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-3">
                    {guess.isCorrect ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : guess.movieTitle === 'Gave Up' ? (
                      <span className="text-lg">🏳️</span>
                    ) : guess.movieTitle === 'Skipped' ? (
                      <span className="text-lg">⏭️</span>
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {guess.movieTitle === 'Gave Up' ? 'Gave Up' : guess.movieTitle === 'Skipped' ? 'Skipped' : guess.movieTitle}
                      </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 border-t border-border">
            <div>
              <div className="text-2xl font-bold">{attemptsUsed}</div>
              <div className="text-sm text-muted-foreground">Attempts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatClarity(clarityLevel)}</div>
              <div className="text-sm text-muted-foreground">Clarity</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{finalScore}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
          </div>

          {/* Share Section */}
          <div className="border-t pt-4">
            <div className="text-center mb-3">
              <div className="text-lg font-mono tracking-wider mb-2">
                Poster Pixels #{puzzleNumber} {generateResultEmojis()}
              </div>
              {generateBonusText() && (
                <div className="text-sm text-muted-foreground mb-1">
                  {generateBonusText()}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {formatTime(timeElapsed)} • {won ? finalScore : 0} pts
              </div>
              {!won && (
                <div className="text-sm text-muted-foreground mt-1">
                  I gave up!
                </div>
              )}
            </div>
            
            <ShareSection 
              shareText={generateFallbackShareText()}
              shareUrl="https://cinamini.app/game/poster-pixels"
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