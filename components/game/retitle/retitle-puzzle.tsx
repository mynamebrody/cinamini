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
      {/* Boarding Pass Style Display */}
      <div className="text-center space-y-4">
        <div className="max-w-2xl mx-auto">
          {/* Boarding Pass Style Display */}
          <div className="bg-white p-6 border-2 border-solid space-y-3 shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)]" style={{ borderRadius: 0, borderColor: 'rgb(209,210,212)' }}>
            {/* Ticket header */}
            <div className="text-center border-b border-dashed border-[#d1d2d4] pb-2">
              <div className="text-xs font-mono text-muted-foreground">CINAMINI AIRLINES - BOARDING PASS</div>
            </div>
            
            {/* Flight Status */}
            <div className="text-center border-b border-dashed border-[#d1d2d4] pb-2">
              <div className="flex items-center justify-center gap-2">
                <div className="text-sm font-mono text-red-600 animate-pulse">✈️ IN FLIGHT</div>
              </div>
            </div>
            
            {/* Destination info */}
            <div className="space-y-3">
              {/* Country/Destination */}
              <div className="text-center">
                <div className="text-base font-semibold">{puzzle.countryName}</div>
                <div className="text-xs text-muted-foreground">DESTINATION</div>
              </div>
              
              {/* Flag centered */}
              <div className="text-center">
                <div className="text-3xl">{puzzle.flagEmoji}</div>
              </div>
              
              {/* Title in destination */}
              <div className="text-center">
                <div className="text-lg font-bold">{puzzle.localizedTitle}</div>
                <div className="text-xs text-muted-foreground">TITLE IN DESTINATION</div>
              </div>
            </div>
            
            {puzzle.englishTranslation && (
              <div className="text-center border-t border-dashed border-[#d1d2d4] pt-2">
                <p className="text-base text-muted-foreground italic">
                  "{puzzle.englishTranslation}"
                </p>
                <div className="text-xs text-muted-foreground mt-1">LITERAL TRANSLATION</div>
              </div>
            )}
            
            {/* Travel time - dynamic timer */}
            <div className="text-center pt-2 border-t border-dashed border-[#d1d2d4]">
              <div className="text-xs text-muted-foreground font-mono">
                ⏱️ FLIGHT TIME: {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          <span>🎫</span>
          <span>Which movie was lost in translation?</span>
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


    </div>
  )
}