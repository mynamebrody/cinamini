"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Flame } from "lucide-react"
import Image from "next/image"
import { cn, formatGameTime } from "@/lib/utils"
import { useRetitledShare } from "@/hooks/useGameShare"

interface GuessResult {
  correct: boolean
  correctAnswer: {
    id: number
    title: string
    originalTitle: string
    releaseYear: string
    translationNote: string
    posterPath?: string
  }
  stats: {
    gamesPlayed: number
    accuracy: number
    currentStreak: number
  }
  puzzle?: {
    localizedTitle: string
    englishTranslation: string
    countryCode: string
    countryName: string
    flagEmoji: string
  }
}

interface RetitleResultProps {
  result: GuessResult
  puzzleId: string
  puzzleNumber: number
  solveTimeMs?: number
}

export default function RetitleResult({ result, puzzleId, puzzleNumber, solveTimeMs = 0 }: RetitleResultProps) {
  const [shareText, setShareText] = useState<string | null>(null)
  const [, setLoadingShare] = useState(true)
  
  
  const { shareText: centralizedShareText, fetchShare } = useRetitledShare(puzzleId, solveTimeMs, result.correct)
  
  
  const generateFallbackShareText = useCallback(() => {
    const resultEmoji = result.correct ? "✅" : "❌"
    const flagEmoji = result.puzzle?.flagEmoji || "🏳️"
    const timeText = solveTimeMs > 0 ? ` • ${formatGameTime(solveTimeMs)}` : ""
    return `Retitled #${puzzleNumber} ${flagEmoji} • ${resultEmoji}${timeText}`
  }, [result.correct, result.puzzle?.flagEmoji, puzzleNumber, solveTimeMs])

  // Fallback to legacy share API if centralized system fails
  const fetchLegacyShareText = useCallback(async () => {
    try {
      const response = await fetch(`/api/retitled/share/${puzzleId}`)
      
      if (!response.ok) {
        // If API fails (e.g., for anonymous users), use fallback
        setShareText(generateFallbackShareText())
        return
      }
      
      const { shareText } = await response.json()
      
      // Check if legacy API also returns incorrect time data
      if (solveTimeMs > 0 && shareText && (shareText.includes('0s') || shareText.includes('00:00:00'))) {
        console.log('Legacy API also returned incorrect time, using fallback')
        setShareText(generateFallbackShareText())
      } else {
        setShareText(shareText)
      }
    } catch (err) {
      console.error("Error fetching share text:", err)
      // Use fallback instead of showing error for anonymous users
      setShareText(generateFallbackShareText())
    } finally {
      setLoadingShare(false)
    }
  }, [puzzleId, solveTimeMs, generateFallbackShareText])

  useEffect(() => {
    // Always use fallback for anonymous users or when we have solve time but share text doesn't include it
    const shouldUseFallback = !centralizedShareText || 
      (solveTimeMs > 0 && centralizedShareText && (centralizedShareText.includes('0s') || centralizedShareText.includes('00:00:00')))
    
    if (shouldUseFallback) {
      console.log('Using fallback share text generation')
      setShareText(generateFallbackShareText())
      setLoadingShare(false)
    } else {
      // Try centralized sharing first, fallback to legacy API if it fails
      fetchShare().catch(() => {
        console.log('Centralized sharing failed, falling back to legacy API')
        fetchLegacyShareText()
      })
    }
  }, [fetchShare, centralizedShareText, solveTimeMs, generateFallbackShareText, fetchLegacyShareText])
  

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Result Card */}
      <Card className={cn(
        "p-8 text-center space-y-6",
        result.correct 
          ? "border-green-500/50 shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94),3px_3px_0px_rgb(34,197,94),4px_4px_0px_rgb(34,197,94)]" 
          : "border-red-500/50 shadow-[1px_1px_0px_rgb(239,68,68),2px_2px_0px_rgb(239,68,68),3px_3px_0px_rgb(239,68,68),4px_4px_0px_rgb(239,68,68)]"
      )}>
        {/* Icon */}
        <div className={cn(
          "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
          result.correct ? "bg-green-500/20" : "bg-red-500/20"
        )}>
          {result.correct ? (
            <Check className="w-10 h-10 text-green-500" />
          ) : (
            <X className="w-10 h-10 text-red-500" />
          )}
        </div>

        {/* Result Text with Travel Theme */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2 font-funnel-display-bold">
            {result.correct ? (
              <>
                <span>🎆</span>
                <span>Journey Complete!</span>
                <span>✈️</span>
              </>
            ) : (
              <>
                <span>🎠</span>
                <span>Next Departure!</span>
                <span>🗺️</span>
              </>
            )}
          </h2>
          <p className="text-muted-foreground">
            {result.correct ? `Passport stamped for: ${result.puzzle?.flagEmoji || '🏳️'}` : `The destination was: ${result.puzzle?.flagEmoji || '🏳️'}`}
          </p>
        </div>

        {/* Movie Poster */}
        {result.correctAnswer.posterPath && (
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-72 border border-[#3a3a3c] shadow-[1px_1px_0px_rgb(58,58,60),2px_2px_0px_rgb(58,58,60),3px_3px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60)] overflow-hidden" style={{ borderRadius: 0 }}>
              <Image
                src={`https://image.tmdb.org/t/p/w342${result.correctAnswer.posterPath}`}
                alt={`${result.correctAnswer.title} poster`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 192px, 192px"
              />
            </div>
          </div>
        )}

        {/* Movie Details */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground font-funnel-display-bold">
            {result.correctAnswer.title} ({result.correctAnswer.releaseYear})
          </h3>
          
          {/* Travel Ticket Style Display */}
          {result.puzzle && (
            <div className="bg-card p-4 border-2 border-border space-y-3 shadow-[1px_1px_0px_rgb(var(--border)),2px_2px_0px_rgb(var(--border)),3px_3px_0px_rgb(var(--border)),4px_4px_0px_rgb(var(--border))]" style={{ borderRadius: 0 }}>
              {/* Ticket header */}
              <div className="text-center border-b border-dashed border-border pb-2">
                <div className="text-xs font-mono text-muted-foreground">CINAMINI AIRLINES - BOARDING PASS</div>
              </div>
              <div className="text-center border-b border-dashed border-border pb-2 mt-2">
                <div className="text-xs font-mono text-muted-foreground">
                  Retitled #{puzzleNumber}
                </div>
              </div>
              
              {/* Destination info */}
              <div className="space-y-3">
                {/* Country/Destination */}
                <div className="text-center">
                  <div className="text-base font-semibold">{result.puzzle.countryName || "Unknown Country"}</div>
                  <div className="text-xs text-muted-foreground">DESTINATION</div>
                </div>
                
                {/* Flag centered */}
                <div className="text-center">
                  <div className="text-3xl">{result.puzzle.flagEmoji}</div>
                </div>
                
                {/* Title in destination */}
                <div className="text-center">
                  <div className="text-lg font-bold">{result.puzzle.localizedTitle}</div>
                  <div className="text-xs text-muted-foreground">TITLE IN DESTINATION</div>
                </div>
              </div>
              
              {result.puzzle.englishTranslation && (
                <div className="text-center border-t border-dashed border-border pt-2">
                  <p className="text-base text-muted-foreground italic">
                    &quot;{result.puzzle.englishTranslation}&quot;
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">LITERAL TRANSLATION</div>
                </div>
              )}
              
              {result.correctAnswer.translationNote && (
                <div className="bg-muted/50 p-2 text-center" style={{ borderRadius: 0 }}>
                  <p className="text-sm text-muted-foreground">
                    📝 {result.correctAnswer.translationNote}
                  </p>
                </div>
              )}
              
              {/* Travel time and ticket stub */}
              <div className="text-center pt-2 border-t border-dashed border-border">
                {solveTimeMs > 0 && (
                  <div className="text-xs text-muted-foreground font-mono mb-1">
                    ⏱️ TRAVEL TIME: {formatGameTime(solveTimeMs)}
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-mono">
                  {result.correct ? '✅ VALID JOURNEY' : '📋 LEARNING EXPERIENCE'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats - only show if stats are available */}
        {result.stats && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-2xl font-bold text-foreground">{result.stats.gamesPlayed || 0}</p>
              <p className="text-xs text-muted-foreground">Games Played</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{result.stats.accuracy || 0}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                {result.stats.currentStreak || 0}
                {(result.stats.currentStreak || 0) > 0 && <Flame className="w-4 h-4 text-orange-500" />}
              </p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          </div>
        )}

        {/* Actions */}
      <div className="space-y-3">
        {/* Share Preview */}
        <div className="bg-gradient-to-b from-muted/50 to-muted border border-border p-4 text-center" style={{ borderRadius: 0 }}>
          {(() => {
            const text = centralizedShareText || shareText || generateFallbackShareText()
            const lines = text.split('\n')
            const firstLine = lines[0] || ''
            
            // Parse first line to extract title and emoji pattern
            const titleMatch = firstLine.match(/^(.*?#\d+)\s+.*?•\s*(.*)$/)
            if (titleMatch) {
              const gameTitle = titleMatch[1] // "Retitled #12"
              const result = titleMatch[2] // "✅" or "❌"
              
              return (
                <>
                  <p className="font-mono text-lg mb-2">{gameTitle}</p>
                  <p className="font-mono text-2xl mb-2">{result}</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {lines.slice(1).join(' ')}
                  </p>
                </>
              )
            }
            
            // Fallback parsing for different format
            const parts = firstLine.split(' #')
            if (parts.length === 2) {
              const titlePart = parts[0] + ' #' + parts[1].split(' ')[0] // "Retitled #12"
              const restOfLine = parts[1].substring(parts[1].indexOf(' ') + 1) // Everything after the number
              
              return (
                <>
                  <p className="font-mono text-lg mb-2">{titlePart}</p>
                  <p className="font-mono text-2xl mb-2">{restOfLine}</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {lines.slice(1).join(' ')}
                  </p>
                </>
              )
            }
            
            // Final fallback
            return <p className="font-mono text-lg">{text}</p>
          })()}
        </div>
        
        <ShareSection 
          shareText={centralizedShareText || shareText || generateFallbackShareText()}
          shareUrl="https://cinamini.app/game/retitled"
        />
        
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <span>🌅</span>
            <span>Next departure: Tomorrow&apos;s adventure awaits!</span>
            <span>🎆</span>
          </p>
        </div>
      </div>
      </Card>
    </div>
  )
}