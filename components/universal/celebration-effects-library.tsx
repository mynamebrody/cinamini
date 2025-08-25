"use client"

import { GameTheme, AchievementTier, HapticPattern } from "@/lib/universal-achievements"
import { UniversalConfetti } from "./universal-confetti"

// Celebration Effects Library
// Provides unified haptic and visual effects across all games

export class CelebrationLibrary {

  // Create themed confetti burst
  static createConfetti(
    gameTheme: GameTheme, 
    intensity: 'light' | 'medium' | 'heavy' = 'medium',
    duration = 3000
  ) {
    return {
      component: UniversalConfetti,
      props: {
        show: true,
        gameTheme,
        intensity,
        duration
      }
    }
  }


  // Generate haptic feedback
  static triggerHapticFeedback(pattern: HapticPattern): void {
    if (typeof window === 'undefined' || !navigator.vibrate) return

    try {
      switch (pattern) {
        case 'light':
          navigator.vibrate(50)
          break
        case 'medium':
          navigator.vibrate([100, 50, 100])
          break
        case 'heavy':
          navigator.vibrate([200, 100, 200, 100, 200])
          break
        case 'success':
          navigator.vibrate([50, 30, 100, 30, 150])
          break
        case 'error':
          navigator.vibrate([300, 100, 300])
          break
      }
    } catch (error) {
      console.log('Haptic feedback failed:', error)
    }
  }

  // Complete celebration sequence
  static celebrateAchievement(
    gameTheme: GameTheme,
    tier: AchievementTier,
    options: {
      includeConfetti?: boolean
      includeSound?: boolean
      includeHaptic?: boolean
      customIntensity?: 'light' | 'medium' | 'heavy'
    } = {}
  ) {
    const {
      includeConfetti = true,
      includeHaptic = true,
      customIntensity
    } = options

    // Determine intensity based on tier
    const intensity = customIntensity || this.getTierIntensity(tier)
    const hapticPattern = this.getTierHapticPattern(tier)

    // Trigger effects
    if (includeHaptic) {
      this.triggerHapticFeedback(hapticPattern)
    }


    if (includeConfetti) {
      return this.createConfetti(gameTheme, intensity)
    }

    return null
  }

  // Private helper methods

  private static getTierIntensity(tier: AchievementTier): 'light' | 'medium' | 'heavy' {
    switch (tier) {
      case 'bronze':
        return 'light'
      case 'silver':
        return 'medium'
      case 'gold':
      case 'platinum':
      case 'legendary':
        return 'heavy'
      default:
        return 'medium'
    }
  }

  private static getTierHapticPattern(tier: AchievementTier): HapticPattern {
    switch (tier) {
      case 'bronze':
        return 'light'
      case 'silver':
        return 'medium'
      case 'gold':
        return 'heavy'
      case 'platinum':
      case 'legendary':
        return 'success'
      default:
        return 'medium'
    }
  }




  // Game-specific celebration presets
  static castClimbCelebration(tier: AchievementTier = 'bronze') {
    return this.celebrateAchievement('cast-climb', tier)
  }

  static retitledCelebration(tier: AchievementTier = 'bronze') {
    return this.celebrateAchievement('retitled', tier)
  }

  static budgetBracketCelebration(tier: AchievementTier = 'bronze') {
    return this.celebrateAchievement('budget-bracket', tier)
  }

  static posterPixelsCelebration(tier: AchievementTier = 'bronze') {
    return this.celebrateAchievement('poster-pixels', tier)
  }

  static universalCelebration(tier: AchievementTier = 'bronze') {
    return this.celebrateAchievement('universal', tier)
  }
}

// React Hook for easy celebration triggering
import { useCallback, useEffect } from 'react'

export function useCelebration() {


  const celebrate = useCallback((
    gameTheme: GameTheme,
    tier: AchievementTier,
    options?: Parameters<typeof CelebrationLibrary.celebrateAchievement>[2]
  ) => {
    return CelebrationLibrary.celebrateAchievement(gameTheme, tier, options)
  }, [])


  const triggerHaptic = useCallback((pattern: HapticPattern) => {
    CelebrationLibrary.triggerHapticFeedback(pattern)
  }, [])

  const createConfetti = useCallback((
    gameTheme: GameTheme,
    intensity?: 'light' | 'medium' | 'heavy',
    duration?: number
  ) => {
    return CelebrationLibrary.createConfetti(gameTheme, intensity, duration)
  }, [])


  return {
    celebrate,
    triggerHaptic,
    createConfetti
  }
}

// Celebration preset components for common scenarios
export function QuickSuccessCelebration({ gameTheme, show, onComplete }: {
  gameTheme: GameTheme
  show: boolean
  onComplete?: () => void
}) {
  const { triggerHaptic } = useCelebration()

  useEffect(() => {
    if (show) {
      triggerHaptic('success')
      
      const timer = setTimeout(() => {
        onComplete?.()
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [show, gameTheme, triggerHaptic, onComplete])

  if (!show) return null

  return (
    <UniversalConfetti
      show={show}
      gameTheme={gameTheme}
      intensity="light"
      duration={1500}
      onComplete={onComplete}
    />
  )
}

export function EpicAchievementCelebration({ gameTheme, tier, show, onComplete }: {
  gameTheme: GameTheme
  tier: AchievementTier
  show: boolean
  onComplete?: () => void
}) {
  const { celebrate } = useCelebration()

  useEffect(() => {
    if (show) {
      celebrate(gameTheme, tier)
      
      const duration = tier === 'legendary' ? 5000 : tier === 'platinum' ? 4000 : 3000
      const timer = setTimeout(() => {
        onComplete?.()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [show, gameTheme, tier, celebrate, onComplete])

  if (!show) return null

  const duration = tier === 'legendary' ? 5000 : tier === 'platinum' ? 4000 : 3000
  const intensity = ['gold', 'platinum', 'legendary'].includes(tier) ? 'heavy' : 'medium'

  return (
    <UniversalConfetti
      show={show}
      gameTheme={gameTheme}
      intensity={intensity}
      duration={duration}
      onComplete={onComplete}
    />
  )
}
