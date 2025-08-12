"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Flame } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRetitledShare } from "@/hooks/useGameShare"
import type { RetitledShareData } from "@/lib/sharing"

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
  const [loadingShare, setLoadingShare] = useState(true)
  
  // Use centralized sharing system - memoize to prevent infinite re-renders
  const shareData: RetitledShareData = useMemo(() => ({
    guess: {
      isCorrect: result.correct,
      solveTimeMs
    },
    puzzle: {
      puzzleNumber,
      countryCode: result.puzzle?.countryCode || 'US',
      localizedTitle: result.puzzle?.localizedTitle || ''
    }
  }), [result.correct, solveTimeMs, puzzleNumber, result.puzzle?.countryCode, result.puzzle?.localizedTitle])
  
  const { shareText: centralizedShareText, fetchShare, isLoading: isShareLoading } = useRetitledShare(puzzleId)
  
  const generateFallbackShareText = () => {
    const resultEmoji = result.correct ? "✅" : "❌"
    const flagEmoji = result.puzzle?.flagEmoji || "🏳️"
    return `Retitled ${flagEmoji} • ${resultEmoji}`
  }

  useEffect(() => {
    // Try centralized sharing first, fallback to legacy API if it fails
    fetchShare().catch(() => {
      console.log('Centralized sharing failed, falling back to legacy API')
      fetchLegacyShareText()
    })
  }, [fetchShare])
  
  // Fallback to legacy share API if centralized system fails
  const fetchLegacyShareText = async () => {
    try {
      const response = await fetch(`/api/retitled/share/${puzzleId}`)
      
      if (!response.ok) {
        // If API fails (e.g., for anonymous users), use fallback
        setShareText(generateFallbackShareText())
        return
      }
      
      const { shareText } = await response.json()
      setShareText(shareText)
    } catch (err) {
      console.error("Error fetching share text:", err)
      // Use fallback instead of showing error for anonymous users
      setShareText(generateFallbackShareText())
    } finally {
      setLoadingShare(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Result Card */}
      <Card className={cn(
        "p-8 text-center space-y-6",
        "bg-card border",
        result.correct 
          ? "border-green-500/50 shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94),3px_3px_0px_rgb(34,197,94),4px_4px_0px_rgb(34,197,94)]" 
          : "border-red-500/50 shadow-[1px_1px_0px_rgb(239,68,68),2px_2px_0px_rgb(239,68,68),3px_3px_0px_rgb(239,68,68),4px_4px_0px_rgb(239,68,68)]"
      )} style={{ borderRadius: 0 }}>
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
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
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
            {result.correct ? "Passport stamped for:" : "The destination was:"}
          </p>
        </div>

        {/* Movie Poster */}
        {result.correctAnswer.posterPath && (
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-lg">
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
          <h3 className="text-xl font-semibold text-foreground">
            {result.correctAnswer.title} ({result.correctAnswer.releaseYear})
          </h3>
          
          {/* Travel Ticket Style Display */}
          {result.puzzle && (
            <div className="bg-white p-4 border-2 border-solid space-y-3 shadow-[1px_1px_0px_rgb(156,163,175),2px_2px_0px_rgb(156,163,175),3px_3px_0px_rgb(156,163,175),4px_4px_0px_rgb(156,163,175)]" style={{ borderRadius: 0, borderColor: 'rgb(156,163,175)' }}>
              {/* Ticket header */}
              <div className="text-center border-b border-dashed border-gray-400 pb-2">
                <div className="text-xs font-mono text-muted-foreground">CINAMINI AIRLINES - BOARDING PASS</div>
              </div>
              <div className="text-center border-b border-dashed border-gray-400 pb-2 mt-2">
                <div className="text-xs font-mono text-muted-foreground">
                  Retitled #{puzzleNumber}
                </div>
              </div>
              
              {/* Destination info */}
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">{result.puzzle.flagEmoji}</div>
                <div className="text-center">
                  <div className="text-lg font-bold">{result.puzzle.localizedTitle}</div>
                  <div className="text-xs text-muted-foreground">DESTINATION TITLE</div>
                </div>
              </div>
              
              {result.puzzle.englishTranslation && (
                <div className="text-center border-t border-dashed border-gray-400 pt-2">
                  <p className="text-base text-muted-foreground italic">
                    "{result.puzzle.englishTranslation}"
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">LITERAL TRANSLATION</div>
                </div>
              )}
              
              {result.correctAnswer.translationNote && (
                <div className="bg-white/50 dark:bg-black/20 rounded p-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    📝 {result.correctAnswer.translationNote}
                  </p>
                </div>
              )}
              
              {/* Ticket stub */}
              <div className="text-center text-xs text-muted-foreground font-mono pt-2 border-t border-dashed border-gray-400">
                {result.correct ? '✅ VALID JOURNEY' : '📋 LEARNING EXPERIENCE'}
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
              <p className="text-lg font-bold text-foreground">{result.puzzle?.localizedTitle || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Title to Guess</p>
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
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <ShareSection 
          shareText={centralizedShareText || shareText || generateFallbackShareText()}
          shareUrl="https://cinamini.app/game/retitled"
        />
        
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <span>🌅</span>
            <span>Next departure: Tomorrow's adventure awaits!</span>
            <span>🎆</span>
          </p>
        </div>
      </div>
    </div>
  )
}