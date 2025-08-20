"use client"

import { useEffect, useRef, useState, useCallback } from "react"

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
  
  // Use refs to track animation state
  const animationRef = useRef<number | undefined>(undefined)
  const currentAnimatedRef = useRef<number>(targetClarity)
  const targetRef = useRef<number>(targetClarity)
  
  // Update current animated ref whenever animatedClarity changes
  useEffect(() => {
    currentAnimatedRef.current = animatedClarity
  }, [animatedClarity])

  useEffect(() => {
    // Skip if target hasn't changed
    if (targetRef.current === targetClarity) {
      return
    }
    
    // Update target ref
    targetRef.current = targetClarity

    // Cancel any ongoing animation
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current)
    }

    // Get starting value from ref (current animated position)
    const startValue = currentAnimatedRef.current
    const startTime = performance.now()
    
    // Set animating state
    setIsAnimating(true)

    // Animation function
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      
      // Calculate new value
      const newValue = startValue + (targetClarity - startValue) * easedProgress
      
      // Update state
      setAnimatedClarity(newValue)
      
      if (progress < 1) {
        // Continue animation
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        setAnimatedClarity(targetClarity)
        setIsAnimating(false)
        animationRef.current = undefined
      }
    }

    // Start animation
    animationRef.current = requestAnimationFrame(animate)

    // Cleanup function
    return () => {
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
      setIsAnimating(false)
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