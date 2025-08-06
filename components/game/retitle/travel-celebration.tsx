"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

interface TravelCelebrationProps {
  isVisible: boolean
  flagEmoji: string
  countryName: string
  isCorrect: boolean
  onComplete?: () => void
}

const CELEBRATION_MESSAGES = {
  correct: [
    "Passport stamped!",
    "Welcome aboard!",
    "Bon voyage!",
    "Journey complete!",
    "Destination reached!"
  ],
  incorrect: [
    "Next flight departing soon!",
    "Travel plans updated!",
    "Boarding pass issued!",
    "Adventure continues!",
    "New destination ahead!"
  ]
}

const BoardingPass = ({ flagEmoji, countryName, isCorrect }: { 
  flagEmoji: string, 
  countryName: string, 
  isCorrect: boolean 
}) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      className="bg-white text-black p-6 rounded-lg shadow-2xl max-w-sm mx-auto transform rotate-1"
      style={{
        background: isCorrect 
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #ebbb4a 0%, #d4a935 100%)',
        color: 'white'
      }}
    >
      {/* Airline header */}
      <div className="text-center mb-4">
        <div className="text-xl font-bold">CINAMINI AIRLINES</div>
        <div className="text-xs opacity-80">BOARDING PASS</div>
      </div>
      
      {/* Flight info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs opacity-80">DESTINATION</div>
          <div className="font-bold text-lg flex items-center gap-2">
            <span>{flagEmoji}</span>
            <span>{countryName}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">STATUS</div>
          <div className="font-bold">
            {isCorrect ? '✅ ARRIVED' : '🎫 ISSUED'}
          </div>
        </div>
      </div>
      
      {/* Perforated edge */}
      <div className="border-t-2 border-dashed border-white/30 pt-3">
        <div className="text-center text-xs opacity-80">
          THANK YOU FOR FLYING WITH US
        </div>
      </div>
    </motion.div>
  )
}

const AirplaneFly = () => {
  return (
    <motion.div
      className="absolute top-1/2 text-4xl"
      initial={{ x: -100, y: 0, rotate: 0 }}
      animate={{ 
        x: ["100vw", "120vw"], 
        y: [-20, -40, -20],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        duration: 3, 
        ease: "easeInOut",
        times: [0, 1]
      }}
    >
      ✈️
    </motion.div>
  )
}


export default function TravelCelebration({
  isVisible,
  flagEmoji,
  countryName,
  isCorrect,
  onComplete
}: TravelCelebrationProps) {
  const [showBoardingPass, setShowBoardingPass] = useState(false)
  const [showAirplane, setShowAirplane] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState("")

  useEffect(() => {
    if (isVisible) {
      // Set random celebration message
      const messages = isCorrect ? CELEBRATION_MESSAGES.correct : CELEBRATION_MESSAGES.incorrect
      setCelebrationMessage(messages[Math.floor(Math.random() * messages.length)])
      
      // Start celebration sequence
      const sequence = async () => {
        // 1. Flag confetti burst
        if (isCorrect) {
          // Create flag-themed confetti
          const colors = ['#ebbb4a', '#f7ee8b', '#99251d', '#d4a935']
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors,
            shapes: ['square', 'circle'],
            scalar: 1.2
          })
          
          // Second burst with airplane emojis (simulated)
          setTimeout(() => {
            confetti({
              particleCount: 50,
              spread: 50,
              origin: { y: 0.6 },
              colors: ['#60a5fa', '#34d399'],
              scalar: 0.8
            })
          }, 300)
        }
        
        // 2. Show airplane flying across
        setTimeout(() => {
          setShowAirplane(true)
        }, 500)
        
        // 3. Show boarding pass
        setTimeout(() => {
          setShowBoardingPass(true)
        }, 1200)
        
        // 4. Complete celebration
        setTimeout(() => {
          onComplete?.()
        }, 4000)
      }
      
      sequence()
    } else {
      setShowBoardingPass(false)
      setShowAirplane(false)
    }
  }, [isVisible, isCorrect, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          
          {/* Airplane Animation */}
          <AnimatePresence>
            {showAirplane && <AirplaneFly />}
          </AnimatePresence>
          
          {/* Main celebration content */}
          <div className="text-center space-y-6 p-6">
            {/* Celebration message */}
            <motion.h2
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="text-3xl font-bold text-white drop-shadow-lg"
            >
              {celebrationMessage}
            </motion.h2>
            
            {/* Large flag emoji */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 150, delay: 0.4 }}
              className="text-8xl drop-shadow-lg"
            >
              {flagEmoji}
            </motion.div>
            
            {/* Boarding pass */}
            <AnimatePresence>
              {showBoardingPass && (
                <BoardingPass 
                  flagEmoji={flagEmoji}
                  countryName={countryName}
                  isCorrect={isCorrect}
                />
              )}
            </AnimatePresence>
            
            {/* Travel-themed icons floating */}
            <div className="absolute inset-0 pointer-events-none">
              {['🧳', '🗺️', '📍', '🎫', '✈️', '🌍'].map((icon, index) => (
                <motion.div
                  key={index}
                  className="absolute text-2xl opacity-60"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`
                  }}
                  animate={{
                    y: [-10, 10, -10],
                    rotate: [-5, 5, -5],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: index * 0.2
                  }}
                >
                  {icon}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
