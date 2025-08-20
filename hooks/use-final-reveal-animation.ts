"use client"

import { useEffect, useRef, useState } from "react"

interface UseFinalRevealAnimationOptions {
  duration?: number // Duration in milliseconds
  easing?: (t: number) => number // Easing function
  onComplete?: () => void // Callback when animation completes
}

// Custom easing for the reveal - starts slow, accelerates, then decelerates
const revealEasing = (t: number): number => {
  if (t < 0.3) {
    // Slow start
    return 3.33 * t * t
  } else if (t < 0.7) {
    // Acceleration phase
    const adjustedT = (t - 0.3) / 0.4
    return 0.3 + 0.5 * adjustedT
  } else {
    // Deceleration phase
    const adjustedT = (t - 0.7) / 0.3
    return 0.8 + 0.2 * Math.sqrt(adjustedT)
  }
}

export function useFinalRevealAnimation(
  startClarity: number,
  isRevealing: boolean,
  options: UseFinalRevealAnimationOptions = {}
) {
  const { duration = 2000, easing = revealEasing, onComplete } = options
  const [revealClarity, setRevealClarity] = useState(startClarity)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!isRevealing || hasStartedRef.current) {
      return
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Mark that we've started
    hasStartedRef.current = true
    
    // Set up animation parameters
    startTimeRef.current = performance.now()
    setIsAnimating(true)

    // Animation loop - always animates from current clarity to 100
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        return
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)

      // Calculate the new clarity value (90 to 100)
      const targetClarity = 100
      const newClarity = startClarity + (targetClarity - startClarity) * easedProgress

      setRevealClarity(newClarity)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        setIsAnimating(false)
        setRevealClarity(100)
        if (onComplete) {
          onComplete()
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRevealing, startClarity, duration, easing, onComplete])

  // Reset when isRevealing becomes false
  useEffect(() => {
    if (!isRevealing) {
      hasStartedRef.current = false
    }
  }, [isRevealing])

  return { revealClarity, isAnimating }
}