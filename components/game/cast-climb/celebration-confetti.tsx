"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CelebrationConfettiProps {
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

const CELEBRATION_EMOJIS = ["🎉", "🎊", "⭐", "✨", "🏆", "🎭", "🎬", "🍿"]
const COLORS = [
  "text-orange-500",
  "text-yellow-500", 
  "text-green-500",
  "text-blue-500",
  "text-purple-500",
  "text-pink-500",
  "text-red-500"
]

export function CelebrationConfetti({ show, onComplete }: CelebrationConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      // Generate confetti pieces
      const pieces: ConfettiPiece[] = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        animationDelay: Math.random() * 1000,
        animationDuration: 2000 + Math.random() * 1000,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)]
      }))
      
      setConfetti(pieces)
      setIsVisible(true)

      // Hide confetti after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onComplete) {
          onComplete()
        }
      }, 3500)

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
            "absolute text-2xl animate-confetti-fall",
            piece.color
          )}
          style={{
            left: `${piece.left}%`,
            top: "-10%",
            animationDelay: `${piece.animationDelay}ms`,
            animationDuration: `${piece.animationDuration}ms`
          }}
        >
          {piece.emoji}
        </div>
      ))}
      
    </div>
  )
}