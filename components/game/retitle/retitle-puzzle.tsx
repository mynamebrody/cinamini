"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PuzzleData {
  id: string
  puzzleDate: string
  localizedTitle: string
  englishTranslation: string
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
      {/* Flag and Title with Travel Theme */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="text-6xl">{puzzle.flagEmoji}</div>
          <div className="absolute -top-2 -right-2 text-2xl">🗺️</div>
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          📍 Now exploring: {puzzle.countryName}
        </div>
        <div className="max-w-2xl mx-auto">
          <div 
            className="p-4 border border-[#d1d2d4] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)]" 
            style={{ backgroundColor: '#ebbb4a', borderRadius: 0 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">"{puzzle.localizedTitle}"</h2>
            {puzzle.englishTranslation && (
              <p className="text-base md:text-lg text-white/90 italic line-clamp-2">"{puzzle.englishTranslation}"</p>
            )}
          </div>
        </div>
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          <span>🎫</span>
          <span>Which movie earned this title?</span>
          <span>🎬</span>
        </p>
      </div>

      {/* Movie Options with Boarding Pass Style */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {puzzle.options.map((option, index) => (
          <Card
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 relative overflow-hidden",
              "bg-card border border border-[rgb(var(--silver))] hover:border-[rgb(153,37,29)]",
              "hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]",
              selectedId === option.id && "ring-2 ring-primary/50 bg-accent border-[rgb(153,37,29)] shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]",
              isSubmitting && "pointer-events-none opacity-50"
            )}
          >
            {/* Boarding pass perforation effect */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground font-mono">
                  {String.fromCharCode(65 + index)}) {/* A, B, C, D */}
                </div>
                <p className="text-foreground text-lg font-medium">
                  {option.title}
                </p>
              </div>
              
              {selectedId === option.id && (
                <div className="text-red-700 animate-pulse">
                  ✈️
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Travel Timer */}
      <div className="text-center text-muted-foreground">
        <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
          <span className="text-xs">⏱️</span>
          <p className="text-sm font-mono">Flight Time: {formatTime(elapsedTime)}</p>
        </div>
      </div>
    </div>
  )
}