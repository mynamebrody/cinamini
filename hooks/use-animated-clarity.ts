"use client"

import { useEffect, useRef, useState } from "react"

interface UseAnimatedClarityOptions {
  duration?: number // Duration in milliseconds
  easing?: (t: number) => number // Easing function
}

// Default easing function (ease-in-out)
const defaultEasing = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function useAnimatedClarity(
  targetClarity: number,
  options: UseAnimatedClarityOptions = {}
) {
  const { duration = 1000, easing = defaultEasing } = options
  const [animatedClarity, setAnimatedClarity] = useState(targetClarity)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const startClarityRef = useRef<number | undefined>(undefined)
  const targetClarityRef = useRef<number>(targetClarity)

  useEffect(() => {
    // Only animate if the target has changed
    if (targetClarityRef.current === targetClarity) {
      return
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Set up animation parameters
    startClarityRef.current = animatedClarity
    targetClarityRef.current = targetClarity
    startTimeRef.current = performance.now()
    setIsAnimating(true)

    // Animation loop
    const animate = (currentTime: number) => {
      if (!startTimeRef.current || startClarityRef.current === undefined) {
        return
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)

      // Calculate the new clarity value
      const startClarity = startClarityRef.current
      const targetClarity = targetClarityRef.current
      const newClarity = startClarity + (targetClarity - startClarity) * easedProgress

      setAnimatedClarity(newClarity)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        setIsAnimating(false)
        setAnimatedClarity(targetClarity)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetClarity, duration, easing])

  return { animatedClarity, isAnimating }
}

// Additional easing functions for variety
export const easingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: defaultEasing,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
}