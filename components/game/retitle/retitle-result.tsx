"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShareSection } from "@/components/game/share-section"
import { Check, X, Flame } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
    countryCode: string
    flagEmoji: string
  }
}

interface RetitleResultProps {
  result: GuessResult
  puzzleId: string
}

export default function RetitleResult({ result, puzzleId }: RetitleResultProps) {
  const [shareText, setShareText] = useState<string | null>(null)
  const [loadingShare, setLoadingShare] = useState(true)
  
  const generateFallbackShareText = () => {
    const resultEmoji = result.correct ? "🟩" : "🟥"
    const flagEmoji = result.puzzle?.flagEmoji || "🎬"
    return `Retitled ${flagEmoji} ${resultEmoji}⬜⬜⬜`
  }

  useEffect(() => {
    // Fetch share text when component mounts
    const fetchShareText = async () => {
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

    fetchShareText()
  }, [puzzleId])

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Result Card */}
      <Card className={cn(
        "p-8 text-center space-y-6",
        "bg-card border",
        result.correct ? "border-green-500/50" : "border-red-500/50"
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

        {/* Result Text */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {result.correct ? "Correct!" : "Not quite!"}
          </h2>
          <p className="text-muted-foreground">
            The answer was:
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
          
          {/* Localized Title Display */}
          {result.puzzle && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">{result.puzzle.flagEmoji}</span>
                <span className="text-lg font-medium">{result.puzzle.localizedTitle}</span>
              </div>
              <p className="text-sm text-muted-foreground text-center italic">
                {result.correctAnswer.translationNote}
              </p>
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
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <ShareSection 
          shareText={shareText || generateFallbackShareText()}
          shareUrl="https://cinamini.app"
        />
        
        <p className="text-center text-muted-foreground text-sm">
          Come back tomorrow for a new puzzle!
        </p>
      </div>
    </div>
  )
}