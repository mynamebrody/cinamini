"use client"

import { motion } from "framer-motion"

const TravelLoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8">
      {/* Spinning globe */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="text-6xl"
      >
        🌍
      </motion.div>
      
      {/* Airplane flying around */}
      <div className="relative w-32 h-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 text-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ✈️
          </motion.div>
        </motion.div>
      </div>
      
      {/* Loading messages */}
      <div className="text-center space-y-2">
        <motion.h3
          className="text-lg font-semibold text-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Preparing your journey...
        </motion.h3>
        
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        >
          🗺️ Finding today's destination
        </motion.p>
      </div>
      
      {/* Floating travel icons */}
      <div className="absolute inset-0 pointer-events-none">
        {['🧳', '🗺️', '📍', '🎫'].map((icon, index) => {
          // Use deterministic positions based on index to avoid hydration mismatch
          const positions = [
            { left: '25%', top: '30%' },
            { left: '70%', top: '25%' },
            { left: '80%', top: '70%' },
            { left: '15%', top: '75%' }
          ]
          const durations = [3, 4, 3.5, 4.5] // Fixed durations
          
          return (
            <motion.div
              key={index}
              className="absolute text-xl opacity-30"
              style={positions[index]}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                rotate: [-5, 5, -5]
              }}
              transition={{
                duration: durations[index],
                repeat: Infinity,
                delay: index * 0.5
              }}
            >
              {icon}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default TravelLoadingAnimation
