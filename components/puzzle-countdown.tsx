"use client"

import { useState, useEffect } from "react"

export function PuzzleCountdown() {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showCountdown, setShowCountdown] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const utcHours = now.getUTCHours()
      const utcMinutes = now.getUTCMinutes()
      const utcSeconds = now.getUTCSeconds()
      
      // Calculate minutes until midnight UTC
      const minutesUntilMidnight = (24 - utcHours - 1) * 60 + (60 - utcMinutes)
      
      // Show countdown only in the last 60 minutes
      if (minutesUntilMidnight <= 60) {
        const secondsRemaining = minutesUntilMidnight * 60 - utcSeconds
        setTimeRemaining(secondsRemaining)
        setShowCountdown(true)
      } else {
        setShowCountdown(false)
      }
    }

    // Calculate initially
    calculateTimeRemaining()

    // Update every second
    const timer = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!showCountdown || timeRemaining === null) return null

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <div className="inline-flex items-center gap-2 text-xs md:text-sm text-cinema-red font-funnel font-medium">
      <svg 
        className="w-4 h-4 animate-pulse" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span>
        New puzzles in {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}