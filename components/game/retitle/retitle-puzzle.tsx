"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PuzzleData {
  id: string
  puzzleDate: string
  localizedTitle: string
  countryCode: string
  countryName: string
  flagEmoji: string
  options: Array<{ id: number; title: string }>
}

interface RetitlePuzzleProps {
  puzzle: PuzzleData
  onGuess: (filmId: number) => void
  startTime: number
}

export default function RetitlePuzzle({ puzzle, onGuess, startTime }: RetitlePuzzleProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const handleSelect = async (filmId: number) => {
    if (isSubmitting) return
    
    setSelectedId(filmId)
    setIsSubmitting(true)
    
    // Small delay for animation
    setTimeout(() => {
      onGuess(filmId)
    }, 300)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8">
      {/* Flag and Title */}
      <div className="text-center space-y-4">
        <div className="text-6xl">{puzzle.flagEmoji}</div>
        <div className="text-sm text-muted-foreground">{puzzle.countryName}</div>
        <h2 className="text-3xl font-bold text-foreground">"{puzzle.localizedTitle}"</h2>
        <p className="text-muted-foreground">Which movie is this?</p>
      </div>

      {/* Options */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {puzzle.options.map((option) => (
          <Card
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200",
              "bg-card border hover:bg-accent hover:border-accent-foreground/20",
              "transform hover:scale-[1.02] active:scale-[0.98]",
              selectedId === option.id && "ring-2 ring-primary/50 bg-accent",
              isSubmitting && "pointer-events-none opacity-50"
            )}
          >
            <p className="text-foreground text-lg font-medium text-center">
              {option.title}
            </p>
          </Card>
        ))}
      </div>

      {/* Timer */}
      <div className="text-center text-muted-foreground">
        <p className="text-sm">Timer: {formatTime(elapsedTime)}</p>
      </div>
    </div>
  )
}