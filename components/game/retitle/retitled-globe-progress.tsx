"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface RetitledGlobeProgressProps {
  countryCode: string
  countryName: string
  flagEmoji: string
  gameState: 'preparing' | 'traveling' | 'arrived' | 'celebrating' | 'completed'
  visitedCountries?: string[] // Array of country codes
  className?: string
  onAnimationComplete?: () => void
}

const GLOBE_PATTERNS = {
  // Simplified world map representation using CSS gradients - Golden theme
  worldMap: `
    radial-gradient(ellipse 20% 40% at 30% 20%, #d4af37 0%, transparent 50%),
    radial-gradient(ellipse 25% 35% at 70% 30%, #b8860b 0%, transparent 50%),
    radial-gradient(ellipse 30% 45% at 40% 60%, #daa520 0%, transparent 50%),
    radial-gradient(ellipse 35% 25% at 80% 70%, #cd853f 0%, transparent 50%),
    linear-gradient(45deg, #ebbb4a 0%, #d4af37 50%, #b8860b 100%)
  `
}

// Country spotlight positions on the globe (approximated)
const COUNTRY_POSITIONS = {
  'ES': { x: 45, y: 35 }, // Spain
  'FR': { x: 48, y: 32 }, // France
  'DE': { x: 52, y: 30 }, // Germany
  'IT': { x: 52, y: 38 }, // Italy
  'JP': { x: 85, y: 45 }, // Japan
  'KR': { x: 82, y: 42 }, // South Korea
  'CN': { x: 75, y: 40 }, // China
  'IN': { x: 70, y: 50 }, // India
  'BR': { x: 25, y: 70 }, // Brazil
  'MX': { x: 15, y: 45 }, // Mexico
  'RU': { x: 70, y: 25 }, // Russia
  'GB': { x: 48, y: 30 }, // United Kingdom
  'US': { x: 20, y: 40 }, // United States
  'CA': { x: 20, y: 30 }, // Canada
  'AU': { x: 80, y: 75 }, // Australia
  'AR': { x: 28, y: 80 }, // Argentina
  'EG': { x: 55, y: 45 }, // Egypt
  'ZA': { x: 55, y: 85 }, // South Africa
  'NG': { x: 50, y: 55 }, // Nigeria
  'TR': { x: 58, y: 38 }, // Turkey
  'TH': { x: 75, y: 52 }, // Thailand
  'VN': { x: 78, y: 52 }, // Vietnam
  'ID': { x: 78, y: 65 }, // Indonesia
  'PH': { x: 82, y: 55 }, // Philippines
  'MY': { x: 75, y: 58 }, // Malaysia
  'SG': { x: 76, y: 60 }, // Singapore
  'NO': { x: 52, y: 20 }, // Norway
  'SE': { x: 54, y: 22 }, // Sweden
  'FI': { x: 58, y: 20 }, // Finland
  'DK': { x: 52, y: 28 }, // Denmark
  'NL': { x: 50, y: 30 }, // Netherlands
  'BE': { x: 48, y: 31 }, // Belgium
  'CH': { x: 50, y: 34 }, // Switzerland
  'AT': { x: 52, y: 34 }, // Austria
  'PL': { x: 56, y: 30 }, // Poland
  'CZ': { x: 52, y: 32 }, // Czech Republic
  'HU': { x: 56, y: 34 }, // Hungary
  'GR': { x: 56, y: 42 }, // Greece
  'PT': { x: 42, y: 42 }, // Portugal
  'IE': { x: 44, y: 28 }, // Ireland
  'IS': { x: 40, y: 18 }, // Iceland
  'default': { x: 50, y: 50 } // Fallback position
}

const FlagConfetti = ({ isVisible }: { isVisible: boolean }) => {
  const confettiItems = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1,
    x: Math.random() * 100,
    rotation: Math.random() * 360
  }))

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ y: -20, x: `${item.x}%`, opacity: 1, rotate: 0 }}
              animate={{ 
                y: 200, 
                opacity: 0, 
                rotate: item.rotation,
                scale: [1, 1.2, 0.8]
              }}
              transition={{ 
                duration: item.duration, 
                delay: item.delay,
                ease: "easeOut"
              }}
              className="absolute text-2xl"
            >
              🎆
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

const PassportStamp = ({ isVisible, flagEmoji }: { isVisible: boolean, flagEmoji: string }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <div className="bg-red-600/20 border-2 border-red-600 rounded-lg px-4 py-2 rotate-12 transform">
            <div className="text-red-600 font-bold text-sm text-center">
              <div className="text-xl mb-1">{flagEmoji}</div>
              <div>VISITED</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function RetitledGlobeProgress({
  countryCode,
  countryName,
  flagEmoji,
  gameState,
  visitedCountries = [],
  className,
  onAnimationComplete
}: RetitledGlobeProgressProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showPassport, setShowPassport] = useState(false)
  const [globeRotation, setGlobeRotation] = useState(0)
  const [isPulsing, setIsPulsing] = useState(false)

  const currentPosition = COUNTRY_POSITIONS[countryCode as keyof typeof COUNTRY_POSITIONS] || COUNTRY_POSITIONS.default
  const visitedCount = visitedCountries.length
  const totalCountries = 195 // Approximate total countries

  useEffect(() => {
    if (gameState === 'traveling') {
      // Rotate globe to show destination country
      const targetRotation = -(currentPosition.x - 50) * 3.6 // Convert to degrees
      setGlobeRotation(targetRotation)
      setIsPulsing(true)
      
      const timer = setTimeout(() => {
        setIsPulsing(false)
        onAnimationComplete?.()
      }, 2000)
      
      return () => clearTimeout(timer)
    } else if (gameState === 'celebrating') {
      // Show celebration effects
      setShowConfetti(true)
      setShowPassport(true)
      
      const confettiTimer = setTimeout(() => setShowConfetti(false), 3000)
      const passportTimer = setTimeout(() => setShowPassport(false), 2000)
      
      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(passportTimer)
      }
    } else if (gameState === 'preparing') {
      // Gentle spinning preparation
      setGlobeRotation(prev => prev + 360)
    }
  }, [gameState, currentPosition.x, onAnimationComplete])

  const getGameStateText = () => {
    switch (gameState) {
      case 'preparing':
        return 'Preparing your journey...'
      case 'traveling':
        return `Traveling to ${countryName}...`
      case 'arrived':
        return `Welcome to ${countryName}!`
      case 'celebrating':
        return 'Passport stamped!'
      case 'completed':
        return `Journey to ${countryName} complete`
      default:
        return ''
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Flag Confetti */}
      <FlagConfetti isVisible={showConfetti} />
      
      {/* Main Globe Container */}
      <div className="relative mx-auto">
        {/* Passport stamp overlay */}
        <PassportStamp isVisible={showPassport} flagEmoji={flagEmoji} />

        {/* Current destination flag */}
        <motion.div 
          className="text-center mb-2"
          animate={{ 
            scale: gameState === 'arrived' ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.5, repeat: gameState === 'arrived' ? 3 : 0 }}
        >
          <div className="text-4xl mb-2">{flagEmoji}</div>
        </motion.div>

        {/* Travel info */}
        <div className="text-center space-y-2">
          <motion.h3 
            className="text-lg font-semibold text-foreground"
            key={countryName} // Re-animate on country change
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {countryName}
          </motion.h3>
          
          <motion.p 
            className="text-sm text-muted-foreground"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {getGameStateText()}
          </motion.p>

          {/* Progress indicator */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Countries Visited: {visitedCount}/{totalCountries}
            </div>
            <div className="w-32 h-1 bg-muted rounded-full mx-auto overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(visitedCount / totalCountries) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Achievement badges */}
          {visitedCount > 0 && (
            <div className="flex justify-center gap-1 mt-2">
              {visitedCount >= 5 && <span className="text-xs" title="5+ countries">🌍</span>}
              {visitedCount >= 10 && <span className="text-xs" title="World Traveler">✈️</span>}
              {visitedCount >= 25 && <span className="text-xs" title="Globe Trotter">🗺️</span>}
              {visitedCount >= 50 && <span className="text-xs" title="International Explorer">🏆</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
