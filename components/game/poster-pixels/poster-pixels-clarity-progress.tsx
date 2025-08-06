"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PosterPixelsClarityProgressProps {
  clarityLevel: number // 0.2 to 1.0
  timeElapsed: number
  totalTime: number
  isPlaying: boolean
}

export function PosterPixelsClarityProgress({
  clarityLevel,
  timeElapsed,
  totalTime,
  isPlaying
}: PosterPixelsClarityProgressProps) {
  const [showSparkles, setShowSparkles] = useState(false)
  const [brushPosition, setBrushPosition] = useState(0)
  const [lastMilestone, setLastMilestone] = useState(0)

  // Convert clarity level to percentage (20% to 100%)
  const clarityPercent = Math.round((clarityLevel - 0.2) / 0.8 * 100)
  const overallClarityPercent = Math.round(clarityLevel * 100)
  
  // Calculate restoration progress for developer tray
  const developmentProgress = Math.min(100, (timeElapsed / totalTime) * 100)
  
  // Get restoration skill level based on clarity
  const getSkillLevel = (clarity: number) => {
    if (clarity >= 0.9) return { level: "Master Restorer", icon: "🏆", color: "text-yellow-600" }
    if (clarity >= 0.7) return { level: "Expert Artist", icon: "🎨", color: "text-gray-700" }
    if (clarity >= 0.5) return { level: "Skilled Artisan", icon: "✨", color: "text-gray-600" }
    if (clarity >= 0.3) return { level: "Apprentice", icon: "🖌️", color: "text-gray-500" }
    return { level: "Novice Restorer", icon: "🔍", color: "text-gray-400" }
  }

  const skillLevel = getSkillLevel(clarityLevel)

  // Animate brush position across the restoration
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setBrushPosition(prev => (prev + 1) % 100)
      }, 200)
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  // Show sparkles at milestones
  useEffect(() => {
    const milestones = [0.3, 0.5, 0.7, 0.9]
    const currentMilestone = milestones.find(m => 
      clarityLevel >= m && clarityLevel < m + 0.05
    )
    
    if (currentMilestone && isPlaying && currentMilestone !== lastMilestone) {
      setShowSparkles(true)
      setLastMilestone(currentMilestone)
      
      
      const timer = setTimeout(() => setShowSparkles(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [clarityLevel, isPlaying, lastMilestone])

  // Generate film strip frames based on clarity levels
  const filmFrames = [
    { clarity: 0.2, active: clarityLevel >= 0.2, label: "Initial scan" },
    { clarity: 0.4, active: clarityLevel >= 0.4, label: "Basic shapes" },
    { clarity: 0.6, active: clarityLevel >= 0.6, label: "Colors emerge" },
    { clarity: 0.8, active: clarityLevel >= 0.8, label: "Fine details" },
    { clarity: 1.0, active: clarityLevel >= 1.0, label: "Masterpiece" }
  ]

  // Color palette that fills based on clarity
  const paletteColors = [
    { color: "#4b5563", opacity: clarityLevel >= 0.2 ? 1 : 0.3 },
    { color: "#6b7280", opacity: clarityLevel >= 0.4 ? 1 : 0.3 },
    { color: "#9ca3af", opacity: clarityLevel >= 0.6 ? 1 : 0.3 },
    { color: "#d1d5db", opacity: clarityLevel >= 0.8 ? 1 : 0.3 },
    { color: "#f3f4f6", opacity: clarityLevel >= 1.0 ? 1 : 0.3 }
  ]

  return (
    <div className="w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-lg border border-gray-300/50">
      {/* Art Studio Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-2"
        >
          <span className="text-2xl">🎨</span>
          <h3 className="text-xl font-bold text-gray-800">Restoration Studio</h3>
          <span className="text-2xl">🖼️</span>
        </motion.div>
        
        <div className={`text-sm font-medium ${skillLevel.color} flex items-center justify-center gap-2`}>
          <span className="text-lg">{skillLevel.icon}</span>
          <span>{skillLevel.level}</span>
        </div>
      </div>

      {/* Developer Tray - Main centerpiece */}
      <div className="relative mb-6">
        <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-1 shadow-inner">
          <div className="bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl h-24 relative overflow-hidden">
            {/* Developer liquid */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-600 via-gray-500 to-gray-400 rounded-b-xl"
              style={{ height: `${developmentProgress}%` }}
              animate={{
                background: [
                  "linear-gradient(to top, #4b5563, #6b7280, #9ca3af)",
                  "linear-gradient(to top, #6b7280, #9ca3af, #d1d5db)",
                  "linear-gradient(to top, #4b5563, #6b7280, #9ca3af)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Liquid surface ripples */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 opacity-60">
                <motion.div
                  className="h-full bg-white/30 rounded-full"
                  animate={{ x: [-10, 100, -10] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: "20px" }}
                />
              </div>
            </motion.div>

            {/* Developing image representation */}
            <div className="absolute inset-4 border-2 border-white/30 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <motion.div
                className="text-white/80 text-sm text-center"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: clarityLevel }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-xs mb-1">Developing...</div>
                <div className="font-bold">{overallClarityPercent}%</div>
              </motion.div>
            </div>

            {/* Magnifying glass that moves */}
            <motion.div
              className="absolute top-2 text-2xl"
              animate={{ 
                x: [10, 120, 10],
                rotate: [0, 15, -15, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              🔍
            </motion.div>

            {/* Sparkles for milestones */}
            <AnimatePresence>
              {showSparkles && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-yellow-300 text-lg"
                      style={{
                        left: `${20 + (i * 10)}%`,
                        top: `${20 + (i % 3) * 20}%`
                      }}
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ 
                        scale: [0, 1.2, 0], 
                        rotate: 360,
                        y: [-10, -20, -10]
                      }}
                      transition={{ 
                        duration: 1, 
                        delay: i * 0.1,
                        ease: "easeOut"
                      }}
                    >
                      ✨
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Developer tray label */}
        <div className="text-center mt-2 text-sm text-gray-600">
          <span className="font-medium">Development Progress: {Math.round(developmentProgress)}%</span>
        </div>
      </div>

      {/* Film Strip Timeline */}
      <div className="mb-6">
        <div className="flex items-center justify-center mb-3">
          <span className="text-lg mr-2">🎞️</span>
          <span className="text-sm font-medium text-gray-700">Restoration Timeline</span>
        </div>
        
        <div className="flex justify-between items-center bg-black rounded-lg p-2 border-4 border-gray-800">
          {filmFrames.map((frame, index) => (
            <motion.div
              key={index}
              className={`flex-1 mx-1 h-12 rounded border-2 relative overflow-hidden ${
                frame.active 
                  ? 'border-gray-400 bg-gradient-to-br from-gray-200 to-gray-300' 
                  : 'border-gray-600 bg-gray-700'
              }`}
              animate={{
                scale: frame.active ? 1.05 : 1,
                boxShadow: frame.active 
                  ? "0 0 20px rgba(107, 114, 128, 0.5)"
                  : "0 0 0px rgba(0,0,0,0)"
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Film perforations */}
              <div className="absolute left-1 top-1 w-1 h-1 bg-black rounded-full" />
              <div className="absolute left-1 bottom-1 w-1 h-1 bg-black rounded-full" />
              <div className="absolute right-1 top-1 w-1 h-1 bg-black rounded-full" />
              <div className="absolute right-1 bottom-1 w-1 h-1 bg-black rounded-full" />
              
              {/* Frame content */}
              <div className="flex items-center justify-center h-full">
                <div className={`text-xs font-medium text-center px-1 ${
                  frame.active ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  {Math.round(frame.clarity * 100)}%
                </div>
              </div>

              {/* Active frame indicator */}
              {frame.active && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Artist Palette and Tools */}
      <div className="flex justify-between items-center">
        {/* Paint Palette */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Palette base */}
            <div className="w-16 h-12 bg-white rounded-2xl border-2 border-gray-300 shadow-md relative">
              {/* Paint colors arranged on palette */}
              {paletteColors.map((paint, index) => (
                <motion.div
                  key={index}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: paint.color,
                    opacity: paint.opacity,
                    left: `${15 + index * 8}px`,
                    top: `${8 + (index % 2) * 6}px`
                  }}
                  animate={{
                    scale: paint.opacity > 0.5 ? [1, 1.2, 1] : 1
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    delay: index * 0.2
                  }}
                />
              ))}
              
              {/* Palette thumb hole */}
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-4 bg-gray-100 rounded-full border border-gray-300" />
            </div>

            {/* Animated brush */}
            <motion.div
              className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-lg"
              animate={{
                rotate: [-15, 15, -15],
                x: [0, 3, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🖌️
            </motion.div>
          </div>

          <div className="text-xs text-gray-600">
            <div className="font-medium">Restoration Tools</div>
            <div>Ready for masterpiece</div>
          </div>
        </div>

        {/* Clarity Meter */}
        <div className="text-right">
          <div className="text-xs text-gray-600 mb-1">Image Clarity</div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gray-400 to-gray-600 rounded-full"
                style={{ width: `${overallClarityPercent}%` }}
                animate={{
                  background: overallClarityPercent > 80 
                    ? "linear-gradient(to right, #d1d5db, #f3f4f6)"
                    : "linear-gradient(to right, #6b7280, #4b5563)"
                }}
              />
            </div>
            <span className="text-sm font-bold text-gray-700">
              {overallClarityPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Restoration Status Message */}
      <motion.div
        className="mt-4 text-center py-2 px-4 bg-white/50 rounded-lg"
        animate={{
          background: clarityLevel > 0.8 
            ? "linear-gradient(45deg, #fef3c7, #fde68a)"
            : "rgba(255, 255, 255, 0.5)"
        }}
      >
        <div className="text-sm font-medium text-gray-700">
          {clarityLevel >= 0.9 && "🏆 Masterpiece restoration in progress!"}
          {clarityLevel >= 0.7 && clarityLevel < 0.9 && "✨ Excellent detail work!"}
          {clarityLevel >= 0.5 && clarityLevel < 0.7 && "🔍 Key features emerging..."}
          {clarityLevel >= 0.3 && clarityLevel < 0.5 && "🖌️ Basic shapes taking form..."}
          {clarityLevel < 0.3 && "🔍 Beginning restoration process..."}
        </div>
      </motion.div>
    </div>
  )
}