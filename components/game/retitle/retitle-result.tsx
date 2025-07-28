"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, Share2, Flame, Copy } from "lucide-react"
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
  }
  stats: {
    gamesPlayed: number
    accuracy: number
    currentStreak: number
  }
}

interface RetitleResultProps {
  result: GuessResult
  puzzleId: string
}

export default function RetitleResult({ result, puzzleId }: RetitleResultProps) {
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    try {
      setSharing(true)
      const response = await fetch(`/api/retitled/share/${puzzleId}`)
      
      if (!response.ok) {
        throw new Error("Failed to generate share text")
      }
      
      const { shareText } = await response.json()
      
      // Try to use the Web Share API first
      if (navigator.share && /mobile/i.test(navigator.userAgent)) {
        await navigator.share({
          text: shareText,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText)
        toast.success("Copied to clipboard!")
      }
    } catch (err) {
      console.error("Error sharing:", err)
      toast.error("Failed to share. Please try again.")
    } finally {
      setSharing(false)
    }
  }

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

        {/* Movie Details */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {result.correctAnswer.title} ({result.correctAnswer.releaseYear})
          </h3>
          <p className="text-sm text-muted-foreground italic">
            {result.correctAnswer.translationNote}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-2xl font-bold text-foreground">{result.stats.gamesPlayed}</p>
            <p className="text-xs text-muted-foreground">Games Played</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{result.stats.accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              {result.stats.currentStreak}
              {result.stats.currentStreak > 0 && <Flame className="w-4 h-4 text-orange-500" />}
            </p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleShare}
          disabled={sharing}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {sharing ? (
            "Sharing..."
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Share Result
            </>
          )}
        </Button>
        
        <p className="text-center text-muted-foreground text-sm">
          Come back tomorrow for a new puzzle!
        </p>
      </div>
    </div>
  )
}