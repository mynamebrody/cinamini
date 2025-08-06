"use client"

// Simple sound effects system for Poster Pixels art restoration
export class PosterPixelsSounds {
  private static audioContext: AudioContext | null = null
  private static enabled = true

  // Initialize audio context (call this on first user interaction)
  static initialize() {
    if (typeof window === 'undefined') return
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Audio context not supported:', error)
      this.enabled = false
    }
  }

  // Create a simple tone for different restoration sounds
  private static createTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled || !this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      oscillator.type = type
      
      // Gentle fade in/out
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration)
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (error) {
      console.warn('Sound effect failed:', error)
    }
  }

  // Camera shutter sound (for game start)
  static playShutter() {
    // Quick sharp sound like a camera shutter
    this.createTone(800, 0.1, 'square')
    setTimeout(() => this.createTone(400, 0.05, 'square'), 50)
  }

  // Paint brush stroke (for clarity milestones)
  static playBrushStroke() {
    // Soft swoosh-like sound
    this.createTone(200, 0.3, 'sine')
  }

  // Magnifying glass inspection (for detail reveals)
  static playInspection() {
    // Gentle ascending tone
    if (!this.enabled || !this.audioContext) return
    
    const frequencies = [220, 246, 277, 311]
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.createTone(freq, 0.15, 'sine'), i * 50)
    })
  }

  // Art gallery applause (for successful restoration)
  static playApplause() {
    // Multiple quick tones to simulate applause
    if (!this.enabled || !this.audioContext) return
    
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const freq = 300 + Math.random() * 200
        this.createTone(freq, 0.1, 'triangle')
      }, i * 100)
    }
  }

  // Gentle chime for milestone achievements
  static playChime() {
    // Pleasant ascending chime
    if (!this.enabled || !this.audioContext) return
    
    const notes = [523, 659, 784] // C, E, G
    notes.forEach((note, i) => {
      setTimeout(() => this.createTone(note, 0.4, 'sine'), i * 150)
    })
  }

  // Enable/disable sounds
  static setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  static isEnabled() {
    return this.enabled
  }
}

// React hook for easy sound integration
export function usePosterPixelsSounds() {
  const playShutter = () => PosterPixelsSounds.playShutter()
  const playBrushStroke = () => PosterPixelsSounds.playBrushStroke()
  const playInspection = () => PosterPixelsSounds.playInspection()
  const playApplause = () => PosterPixelsSounds.playApplause()
  const playChime = () => PosterPixelsSounds.playChime()

  return {
    playShutter,
    playBrushStroke,
    playInspection,
    playApplause,
    playChime,
    initialize: PosterPixelsSounds.initialize,
    setEnabled: PosterPixelsSounds.setEnabled,
    isEnabled: PosterPixelsSounds.isEnabled,
  }
}