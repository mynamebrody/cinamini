"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Trophy } from "lucide-react"
import { cn, formatGameTime } from "@/lib/utils"
import Image from "next/image"

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
  puzzleNumber,
  won, 
  timeElapsed, 
  clarityLevel, 
  movieTitle, 
  movieYear,
  moviePosterUrl,
  guesses,
  finalScore = 0
}: PosterPixelsResultProps) {
  const formatClarity = (clarity: number) => {
    return `${Math.round(clarity)}%`
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
    if (won) {
      if (attemptsUsed === 0) {
        return "First guess! 🥇"
      } else if (attemptsUsed === 1) {
        return "Second try! 🥈"
      } else if (attemptsUsed === 2) {
        return "Third time's the charm! 🥉"
      } else {
        return `Solved in ${attemptsUsed + 1} attempts! 🎯`
      }
    } else {
      return "Better luck next time! 💪"
    }
  }

  // Fallback share text function for loading states or errors
  function generateFallbackShareText(): string {
    const puzzleInfo = `Poster Pixels #${puzzleNumber}`
    const resultEmojis = generateResultEmojis()
    const bonusText = generateBonusText()
    const timeText = formatGameTime(timeElapsed)
    
    let shareText = `${puzzleInfo} ${resultEmojis}\n${bonusText}`
    
    if (finalScore > 0) {
      shareText += `\n${timeText} • ${finalScore} pts`
      
      // Add "I gave up!" if the user didn't win
      if (!won) {
        shareText += `\nI gave up!`
      }
    }
    
    return shareText
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
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
              <div className="relative w-48 h-72 border border-[#3a3a3c] shadow-[1px_1px_0px_rgb(58,58,60),2px_2px_0px_rgb(58,58,60),3px_3px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60)] overflow-hidden" style={{ borderRadius: 0 }}>
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
              <div className="p-3 bg-[#f8f9fa] border border-[#d1d2d4] text-center text-muted-foreground" style={{ borderRadius: 0 }}>
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
              <div className="text-2xl font-bold">{formatGameTime(timeElapsed)}</div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{finalScore}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
          </div>

          {/* Share Section */}
          <div className="border-t pt-4">
            {/* Share Preview */}
            <div className="bg-gradient-to-b from-gray-50 to-gray-100 border border-[#d1d2d4] p-4 text-center mb-3" style={{ borderRadius: 0 }}>
              {(() => {
                const text = generateFallbackShareText()
                const lines = text.split('\n')
                const firstLine = lines[0] || ''
                const remainingLines = lines.slice(1)
                
                // Parse first line to extract title and emoji pattern
                const titleMatch = firstLine.match(/^(.*?#\d+)\s+(.*)$/)
                if (titleMatch) {
                  const gameTitle = titleMatch[1] // "Poster Pixels #12"
                  const emojiPattern = titleMatch[2] // "🔍🔍🔍✅👾"
                  
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