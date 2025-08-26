"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GameTheme, GAME_THEMES } from "@/lib/universal-achievements"
import { cn } from "@/lib/utils"

interface UniversalConfettiProps {
  show: boolean
  gameTheme: GameTheme
  intensity?: 'light' | 'medium' | 'heavy'
  duration?: number
  onComplete?: () => void
}

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  emoji: string
  velocity: {
    x: number
    y: number
    rotation: number
  }
  lifetime: number
  shape: 'circle' | 'square' | 'triangle'
}

const INTENSITY_CONFIG = {
  light: { count: 15, spread: 50, velocity: 0.8 },
  medium: { count: 30, spread: 70, velocity: 1.0 },
  heavy: { count: 50, spread: 90, velocity: 1.2 }
}

export function UniversalConfetti({
  show,
  gameTheme,
  intensity = 'medium',
  duration = 3000,
  onComplete
}: UniversalConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isVisible, setIsVisible] = useState(false)
  
  const themeConfig = GAME_THEMES[gameTheme]
  const intensityConfig = INTENSITY_CONFIG[intensity]

  // Generate confetti pieces based on game theme
  const generateConfetti = useCallback((): ConfettiPiece[] => {
    const pieces: ConfettiPiece[] = []
    
    for (let i = 0; i < intensityConfig.count; i++) {
      // Random starting position (top of screen, spread horizontally)
      const x = Math.random() * 100
      const y = -10
      
      // Random velocities
      const velocityX = (Math.random() - 0.5) * intensityConfig.spread * intensityConfig.velocity
      const velocityY = (2 + Math.random() * 3) * intensityConfig.velocity
      const velocityRotation = (Math.random() - 0.5) * 360 * intensityConfig.velocity
      
      // Random appearance
      const color = themeConfig.particleConfig.colors[Math.floor(Math.random() * themeConfig.particleConfig.colors.length)]
      const emoji = themeConfig.celebrationEmojis[Math.floor(Math.random() * themeConfig.celebrationEmojis.length)]
      const shape = themeConfig.particleConfig.shapes[Math.floor(Math.random() * themeConfig.particleConfig.shapes.length)]
      
      pieces.push({
        id: i,
        x,
        y,
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.8,
        color,
        emoji,
        velocity: {
          x: velocityX,
          y: velocityY,
          rotation: velocityRotation
        },
        lifetime: duration + Math.random() * 1000,
        shape
      })
    }
    
    return pieces
  }, [duration, themeConfig, intensityConfig])

  useEffect(() => {
    if (show) {
      const pieces = generateConfetti()
      setConfetti(pieces)
      setIsVisible(true)

      // Complete animation
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, duration + 500)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [show, gameTheme, intensity, duration, onComplete, generateConfetti])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {confetti.map((piece) => (
          <ConfettiPiece key={piece.id} piece={piece} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Individual confetti piece component
function ConfettiPiece({ piece }: { piece: ConfettiPiece }) {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      style={{
        left: `${piece.x}%`,
        top: `${piece.y}%`,
      }}
      initial={{
        scale: 0,
        rotation: piece.rotation,
        opacity: 1
      }}
      animate={{
        scale: piece.scale,
        rotation: piece.rotation + piece.velocity.rotation,
        x: piece.velocity.x,
        y: piece.velocity.y + 100, // Fall down
        opacity: [1, 1, 0.8, 0]
      }}
      transition={{
        duration: piece.lifetime / 1000,
        ease: "easeOut",
        opacity: {
          times: [0, 0.7, 0.9, 1],
          ease: "easeInOut"
        }
      }}
    >
      {/* Render emoji or geometric shape */}
      {Math.random() > 0.3 ? (
        <span className="text-2xl select-none">{piece.emoji}</span>
      ) : (
        <GeometricShape 
          shape={piece.shape} 
          color={piece.color} 
          size={20 * piece.scale}
        />
      )}
    </motion.div>
  )
}

// Geometric shapes for variety
function GeometricShape({ 
  shape, 
  color, 
  size 
}: { 
  shape: 'circle' | 'square' | 'triangle'
  color: string
  size: number 
}) {
  const baseClasses = "shadow-lg"
  
  switch (shape) {
    case 'circle':
      return (
        <div 
          className={cn(baseClasses, "rounded-full")}
          style={{
            backgroundColor: color,
            width: size,
            height: size
          }}
        />
      )
    case 'square':
      return (
        <div 
          className={cn(baseClasses, "rounded-sm")}
          style={{
            backgroundColor: color,
            width: size,
            height: size
          }}
        />
      )
    case 'triangle':
      return (
        <div 
          className={baseClasses}
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size/2}px solid transparent`,
            borderRight: `${size/2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
          }}
        />
      )
    default:
      return null
  }
}

// Preset confetti burst functions for easy use
export const ConfettiBursts = {
  // Quick success burst
  success: (gameTheme: GameTheme, onComplete?: () => void) => (
    <UniversalConfetti
      show={true}
      gameTheme={gameTheme}
      intensity="medium"
      duration={2500}
      onComplete={onComplete}
    />
  ),
  
  // Epic achievement burst
  epic: (gameTheme: GameTheme, onComplete?: () => void) => (
    <UniversalConfetti
      show={true}
      gameTheme={gameTheme}
      intensity="heavy"
      duration={4000}
      onComplete={onComplete}
    />
  ),
  
  // Subtle celebration
  subtle: (gameTheme: GameTheme, onComplete?: () => void) => (
    <UniversalConfetti
      show={true}
      gameTheme={gameTheme}
      intensity="light"
      duration={1500}
      onComplete={onComplete}
    />
  )
}

// Canvas-based confetti for maximum performance (alternative implementation)
export class CanvasConfetti {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animationId: number | null = null
  private particles: ConfettiPiece[] = []
  private startTime: number = 0
  private duration: number = 3000
  
  constructor(private gameTheme: GameTheme) {}
  
  init(container: HTMLElement) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    
    if (!this.canvas || !this.ctx) return
    
    this.canvas.style.position = 'fixed'
    this.canvas.style.top = '0'
    this.canvas.style.left = '0'
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.pointerEvents = 'none'
    this.canvas.style.zIndex = '50'
    
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    
    container.appendChild(this.canvas)
  }
  
  burst(intensity: 'light' | 'medium' | 'heavy' = 'medium', duration = 3000) {
    if (!this.ctx) return
    
    this.duration = duration
    this.startTime = Date.now()
    
    // Generate particles similar to React version
    const config = INTENSITY_CONFIG[intensity]
    this.particles = []
    
    for (let i = 0; i < config.count; i++) {
      // Similar particle generation logic as React version
      // This would create canvas-optimized particles
    }
    
    this.animate()
  }
  
  private animate() {
    if (!this.ctx || !this.canvas) return
    
    const elapsed = Date.now() - this.startTime
    if (elapsed > this.duration) {
      this.cleanup()
      return
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Update and draw particles (implementation needed)
    
    this.animationId = requestAnimationFrame(() => this.animate())
  }
  
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
  }
}
