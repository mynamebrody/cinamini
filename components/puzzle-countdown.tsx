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
      
      // Calculate seconds until midnight UTC
      const hoursRemaining = 24 - utcHours - 1
      const minutesRemaining = 60 - utcMinutes - 1
      const secondsUntilMidnight = hoursRemaining * 3600 + minutesRemaining * 60 + (60 - utcSeconds)
      
      setTimeRemaining(secondsUntilMidnight)
      setShowCountdown(true)
    }

    // Calculate initially
    calculateTimeRemaining()

    // Update every second
    const timer = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!showCountdown || timeRemaining === null) return null

  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)
  const seconds = timeRemaining % 60

  // Format time display based on remaining time
  const formatTime = () => {
    if (hours > 0) {
      // Show HH:MM:SS when more than 1 hour
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else if (minutes > 0) {
      // Show MM:SS when less than 1 hour but more than 1 minute
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      // Show SS when less than 1 minute
      return seconds.toString()
    }
  }

  return (
    <div className="text-xs text-neutral-400 font-funnel text-center">
      New puzzles in {formatTime()}
    </div>
  )
}