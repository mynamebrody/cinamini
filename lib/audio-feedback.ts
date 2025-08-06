// Audio feedback utilities for Cast Climb game
// Provides subtle audio cues for climbing progression

class AudioFeedback {
  private audioContext: AudioContext | null = null
  private isEnabled = false

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        this.audioContext = new AudioContext()
        this.isEnabled = true
      } catch (error) {
        console.log('Audio context not available:', error)
      }
    }
  }

  // Enable audio context (must be called after user interaction)
  async enable() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  // Climbing step sound - subtle ascending tone
  playClimbStep(step: number, totalSteps: number) {
    if (!this.isEnabled || !this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      // Calculate frequency based on climbing progress
      const baseFreq = 220 // A3
      const frequency = baseFreq * Math.pow(1.2, step) // Each step is slightly higher
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // Configure tone
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      oscillator.type = 'sine'
      
      // Volume envelope - very subtle
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3)
      
      // Play the tone
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Audio playback failed:', error)
    }
  }

  // Success sound - triumphant ascending arpeggio
  playSuccess() {
    if (!this.isEnabled || !this.audioContext) return

    try {
      const notes = [261.63, 329.63, 392.00, 523.25] // C4, E4, G4, C5
      
      notes.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator()
        const gainNode = this.audioContext!.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext!.destination)
        
        oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
        oscillator.type = 'triangle'
        
        const startTime = this.audioContext!.currentTime + (index * 0.1)
        
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.4)
      })
    } catch (error) {
      console.log('Success audio playback failed:', error)
    }
  }

  // Failure sound - descending tone
  playFailure() {
    if (!this.isEnabled || !this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // Descending frequency
      oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.5)
      oscillator.type = 'sawtooth'
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5)
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Failure audio playback failed:', error)
    }
  }
}

// Singleton instance
let audioFeedback: AudioFeedback | null = null

export function getAudioFeedback(): AudioFeedback {
  if (!audioFeedback) {
    audioFeedback = new AudioFeedback()
  }
  return audioFeedback
}

// Convenience functions
export function playClimbStep(step: number, totalSteps: number) {
  getAudioFeedback().playClimbStep(step, totalSteps)
}

export function playSuccess() {
  getAudioFeedback().playSuccess()
}

export function playFailure() {
  getAudioFeedback().playFailure()
}

export function enableAudio() {
  getAudioFeedback().enable()
}