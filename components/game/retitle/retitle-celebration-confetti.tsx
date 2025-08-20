"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface RetitleCelebrationConfettiProps {
  show: boolean
  onComplete?: () => void
}

interface ConfettiPiece {
  id: number
  left: number
  animationDelay: number
  animationDuration: number
  color: string
  emoji: string
}

const TRAVEL_EMOJIS = ["✈️", "🗺️", "🌍", "🌎", "🌏", "🧳", "📍", "🎫"]
const COLORS = [
  "text-blue-500",
  "text-sky-500", 
  "text-teal-500",
  "text-green-500",
  "text-yellow-500",
  "text-orange-500",
  "text-red-500"
]

export function RetitleCelebrationConfetti({ show, onComplete }: RetitleCelebrationConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      // Generate confetti pieces with travel-themed emojis
      const pieces: ConfettiPiece[] = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        animationDelay: Math.random() * 1500,
        animationDuration: 2500 + Math.random() * 1500,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        emoji: TRAVEL_EMOJIS[Math.floor(Math.random() * TRAVEL_EMOJIS.length)]
      }))
      
      setConfetti(pieces)
      setIsVisible(true)

      // Hide confetti after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onComplete) {
          onComplete()
        }
      }, 4000)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={cn(
            "absolute text-3xl animate-confetti-fall",
            piece.color
          )}
          style={{
            left: `${piece.left}%`,
            top: "-10%",
            animationDelay: `${piece.animationDelay}ms`,
            animationDuration: `${piece.animationDuration}ms`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        >
          {piece.emoji}
        </div>
      ))}
    </div>
  )
}