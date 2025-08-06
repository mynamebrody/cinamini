"use client"

import { GameTheme, AchievementTier, HapticPattern, GAME_THEMES } from "@/lib/universal-achievements"
import { UniversalConfetti } from "./universal-confetti"

// Celebration Effects Library
// Provides unified audio, haptic, and visual effects across all games

export class CelebrationLibrary {
  private static audioContext: AudioContext | null = null
  private static isAudioEnabled = false

  // Initialize audio context (must be called after user interaction)
  static async initializeAudio(): Promise<void> {
    if (typeof window === 'undefined') return
    
    try {
      if (!this.audioContext && 'AudioContext' in window) {
        this.audioContext = new AudioContext()
        this.isAudioEnabled = true
      }
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
    } catch (error) {
      console.log('Audio initialization failed:', error)
      this.isAudioEnabled = false
    }
  }

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

  // Play themed achievement sound
  static playAchievementSound(
    gameTheme: GameTheme, 
    tier: AchievementTier,
    customPattern?: 'success' | 'epic' | 'magical'
  ): void {
    if (!this.isAudioEnabled || !this.audioContext) return

    try {
      const themeConfig = GAME_THEMES[gameTheme]
      const pattern = customPattern || this.getTierSoundPattern(tier)
      
      switch (pattern) {
        case 'success':
          this.playSuccessSequence(themeConfig)
          break
        case 'epic':
          this.playEpicSequence(themeConfig)
          break
        case 'magical':
          this.playMagicalSequence(themeConfig)
          break
      }
    } catch (error) {
      console.log('Sound playback failed:', error)
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
      includeSound = true,
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

    if (includeSound) {
      this.playAchievementSound(gameTheme, tier)
    }

    if (includeConfetti) {
      return this.createConfetti(gameTheme, intensity)
    }

    return null
  }

  // Private helper methods
  private static getTierSoundPattern(tier: AchievementTier): 'success' | 'epic' | 'magical' {
    switch (tier) {
      case 'bronze':
        return 'success'
      case 'silver':
      case 'gold':
        return 'epic'
      case 'platinum':
      case 'legendary':
        return 'magical'
      default:
        return 'success'
    }
  }

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

  private static playSuccessSequence(themeConfig: any): void {
    if (!this.audioContext) return

    const { baseFrequency, instrument } = themeConfig.soundProfile
    const notes = [baseFrequency, baseFrequency * 1.25, baseFrequency * 1.5]
    
    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext!.destination)
      
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
      oscillator.type = instrument
      
      const startTime = this.audioContext!.currentTime + (index * 0.15)
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.3)
    })
  }

  private static playEpicSequence(themeConfig: any): void {
    if (!this.audioContext) return

    const { baseFrequency, instrument } = themeConfig.soundProfile
    
    // Epic ascending arpeggio
    const notes = [
      baseFrequency,
      baseFrequency * 1.25,
      baseFrequency * 1.5,
      baseFrequency * 2
    ]
    
    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext!.destination)
      
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
      oscillator.type = instrument
      
      const startTime = this.audioContext!.currentTime + (index * 0.12)
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.4)
    })
  }

  private static playMagicalSequence(themeConfig: any): void {
    if (!this.audioContext) return

    const { baseFrequency } = themeConfig.soundProfile
    
    // Magical shimmering effect
    const frequencies = [
      baseFrequency * 1.5,
      baseFrequency * 2,
      baseFrequency * 2.5,
      baseFrequency * 3,
      baseFrequency * 2,
      baseFrequency * 2.5
    ]
    
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext!.destination)
      
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
      oscillator.type = 'sine' // Always sine for magical effect
      
      const startTime = this.audioContext!.currentTime + (index * 0.08)
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.25)
    })
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
import { useCallback, useEffect, useState } from 'react'

export function useCelebration() {
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  const initializeAudio = useCallback(async () => {
    await CelebrationLibrary.initializeAudio()
    setIsAudioInitialized(true)
  }, [])

  const celebrate = useCallback((
    gameTheme: GameTheme,
    tier: AchievementTier,
    options?: Parameters<typeof CelebrationLibrary.celebrateAchievement>[2]
  ) => {
    return CelebrationLibrary.celebrateAchievement(gameTheme, tier, options)
  }, [])

  const playSound = useCallback((
    gameTheme: GameTheme,
    tier: AchievementTier,
    pattern?: 'success' | 'epic' | 'magical'
  ) => {
    CelebrationLibrary.playAchievementSound(gameTheme, tier, pattern)
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

  // Auto-initialize audio on first user interaction
  useEffect(() => {
    if (!isAudioInitialized) {
      const handleFirstInteraction = () => {
        initializeAudio()
        document.removeEventListener('click', handleFirstInteraction)
        document.removeEventListener('touchstart', handleFirstInteraction)
        document.removeEventListener('keydown', handleFirstInteraction)
      }

      document.addEventListener('click', handleFirstInteraction)
      document.addEventListener('touchstart', handleFirstInteraction)
      document.addEventListener('keydown', handleFirstInteraction)

      return () => {
        document.removeEventListener('click', handleFirstInteraction)
        document.removeEventListener('touchstart', handleFirstInteraction)
        document.removeEventListener('keydown', handleFirstInteraction)
      }
    }
  }, [isAudioInitialized, initializeAudio])

  return {
    celebrate,
    playSound,
    triggerHaptic,
    createConfetti,
    initializeAudio,
    isAudioInitialized
  }
}

// Celebration preset components for common scenarios
export function QuickSuccessCelebration({ gameTheme, show, onComplete }: {
  gameTheme: GameTheme
  show: boolean
  onComplete?: () => void
}) {
  const { triggerHaptic, playSound } = useCelebration()

  useEffect(() => {
    if (show) {
      triggerHaptic('success')
      playSound(gameTheme, 'bronze', 'success')
      
      const timer = setTimeout(() => {
        onComplete?.()
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [show, gameTheme, triggerHaptic, playSound, onComplete])

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
