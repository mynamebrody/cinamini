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
          <div className="bg-cinema-red/20 border-2 border-cinema-red rounded-lg px-4 py-2 rotate-12 transform">
            <div className="text-cinema-red font-bold text-sm text-center">
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
  const [isPulsing, setIsPulsing] = useState(false)

  const visitedCount = visitedCountries.length

  useEffect(() => {
    if (gameState === 'traveling') {
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
    }
  }, [gameState, onAnimationComplete])

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
