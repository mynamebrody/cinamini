"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PosterPixelsArtGalleryCelebrationProps {
  isVisible: boolean
  won: boolean
  clarityLevel: number
  movieTitle: string
  onComplete?: () => void
}

export function PosterPixelsArtGalleryCelebration({
  isVisible,
  won,
  clarityLevel,
  movieTitle,
  onComplete
}: PosterPixelsArtGalleryCelebrationProps) {
  const [showSpotlight, setShowSpotlight] = useState(false)
  const [showPaintSplash, setShowPaintSplash] = useState(false)
  const [showFrame, setShowFrame] = useState(false)
  const [showPlaque, setShowPlaque] = useState(false)

  // Get achievement based on clarity level when guessed
  const getAchievement = (clarity: number, won: boolean) => {
    if (!won) return { 
      title: "Art Student", 
      subtitle: "Keep practicing your restoration skills", 
      icon: "🎓", 
      color: "from-gray-500 to-gray-600",
      stars: 1
    }
    
    if (clarity <= 0.3) return { 
      title: "Master Restorer", 
      subtitle: "Identified from minimal details!", 
      icon: "🏆", 
      color: "from-amber-400 to-amber-600",
      stars: 5
    }
    if (clarity <= 0.5) return { 
      title: "Expert Curator", 
      subtitle: "Excellent restoration instincts", 
      icon: "🎨", 
      color: "from-purple-500 to-purple-700",
      stars: 4
    }
    if (clarity <= 0.7) return { 
      title: "Skilled Artisan", 
      subtitle: "Good eye for artistic detail", 
      icon: "✨", 
      color: "from-blue-500 to-blue-700",
      stars: 3
    }
    return { 
      title: "Art Appreciator", 
      subtitle: "Successfully completed restoration", 
      icon: "🖼️", 
      color: "from-green-500 to-green-600",
      stars: 2
    }
  }

  const achievement = getAchievement(clarityLevel, won)

  // Animation sequence
  useEffect(() => {
    if (isVisible && won) {
      const sequence = async () => {
        // Spotlight first
        setTimeout(() => setShowSpotlight(true), 500)
        // Paint splash
        setTimeout(() => setShowPaintSplash(true), 1000)
        // Golden frame
        setTimeout(() => setShowFrame(true), 1500)
        // Achievement plaque
        setTimeout(() => setShowPlaque(true), 2000)
        // Complete after animations
        setTimeout(() => onComplete?.(), 3500)
      }
      sequence()
    } else if (isVisible && !won) {
      // Quicker sequence for failed attempts
      setTimeout(() => setShowPlaque(true), 500)
      setTimeout(() => onComplete?.(), 2000)
    }
  }, [isVisible, won, onComplete])

  // Reset states when not visible
  useEffect(() => {
    if (!isVisible) {
      setShowSpotlight(false)
      setShowPaintSplash(false)
      setShowFrame(false)
      setShowPlaque(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Spotlight Effect */}
        <AnimatePresence>
          {showSpotlight && won && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={ { opacity: 0 }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-yellow-200/40 via-yellow-100/20 to-transparent rounded-full animate-pulse" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-radial from-white/30 via-white/10 to-transparent rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paint Splash Effects */}
        <AnimatePresence>
          {showPaintSplash && won && (
            <motion.div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: [
                      '#3a3a3c', '#6b7280', '#9ca3af', '#d1d2d4', 
                      '#ebbb4a', '#f7ee8b', '#99251d', '#d4a935'
                    ][i % 8],
                    left: `${20 + (i * 7)}%`,
                    top: `${15 + (i % 4) * 15}%`
                  }}
                  initial={{ scale: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{
                    scale: [0, 1.5, 0.8],
                    x: [(Math.random() - 0.5) * 200],
                    y: [(Math.random() - 0.5) * 200],
                    rotate: 360
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.div
          className="relative z-10 max-w-md mx-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Golden Frame (for wins) */}
          <AnimatePresence>
            {showFrame && won && (
              <motion.div
                className="absolute -inset-8 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 rounded-3xl shadow-2xl"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 15,
                  duration: 0.8 
                }}
              >
                {/* Frame ornaments */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-600 rounded-full shadow-lg" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-600 rounded-full shadow-lg" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-amber-600 rounded-full shadow-lg" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-amber-600 rounded-full shadow-lg" />
                
                {/* Frame inner border */}
                <div className="absolute inset-4 border-4 border-amber-200 rounded-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Achievement Card */}
          <motion.div
            className={`relative bg-gradient-to-br ${achievement.color} p-8 rounded-2xl shadow-2xl text-white text-center`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Achievement Icon */}
            <motion.div
              className="text-6xl mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                delay: 0.8 
              }}
            >
              {achievement.icon}
            </motion.div>

            {/* Achievement Title */}
            <motion.h2
              className="text-2xl font-bold mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              {achievement.title}
            </motion.h2>

            {/* Achievement Subtitle */}
            <motion.p
              className="text-lg opacity-90 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              {achievement.subtitle}
            </motion.p>

            {/* Movie Title */}
            <motion.div
              className="bg-white/20 rounded-xl p-4 mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4 }}
            >
              <p className="text-sm opacity-75">Masterpiece Identified:</p>
              <p className="text-xl font-bold">&ldquo;{movieTitle}&rdquo;</p>
            </motion.div>

            {/* Stars Rating */}
            <motion.div
              className="flex justify-center gap-1 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`text-2xl ${i < achievement.stars ? 'text-yellow-300' : 'text-white/30'}`}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: 1.6 + (i * 0.1),
                    type: "spring",
                    stiffness: 200,
                    damping: 10
                  }}
                >
                  ⭐
                </motion.div>
              ))}
            </motion.div>

            {/* Clarity Level */}
            <motion.div
              className="text-sm opacity-75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
            >
              Restoration completed at {Math.round(clarityLevel * 100)}% clarity
            </motion.div>
          </motion.div>

          {/* Art Gallery Plaque */}
          <AnimatePresence>
            {showPlaque && (
              <motion.div
                className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-amber-100 border-2 border-amber-300 rounded-lg px-4 py-2 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-xs text-amber-800 text-center">
                  <div className="font-bold">🏛️ Gallery Exhibition</div>
                  <div>&ldquo;Movie Poster Restoration&rdquo;</div>
                  <div className="text-amber-600">Curator: You</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Floating Art Tools */}
        {won && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['🎨', '🖌️', '✨', '🔍', '🖼️', '🏆'].map((emoji, i) => (
              <motion.div
                key={i}
                className="absolute text-3xl"
                style={{
                  left: `${10 + (i * 15)}%`,
                  top: `${20 + (i % 3) * 20}%`
                }}
                animate={{
                  y: [-10, -20, -10],
                  rotate: [-5, 5, -5],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut"
                }}
              >
                {emoji}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}