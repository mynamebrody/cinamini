"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { type GameChoice } from "@/lib/budget-bracket-client"
import { DollarSign, Trophy, Star, Briefcase, Crown } from "lucide-react"

interface Floor {
  level: number
  title: string
  emoji: string
  description: string
  color: string
}

interface BudgetBracketTowerProgressProps {
  currentRound: number
  gameChoices: GameChoice[]
  gameState: 'loading' | 'ready' | 'playing' | 'completed' | 'error'
  totalRounds?: number
  onElevatorAnimation?: (floor: number) => void
}

const FLOORS: Floor[] = [
  {
    level: 1,
    title: "Mail Room",
    emoji: "📬",
    description: "Starting from the bottom",
    color: "from-gray-400 to-gray-600"
  },
  {
    level: 2,
    title: "Producer's Office",
    emoji: "🎬",
    description: "Making things happen",
    color: "from-green-400 to-green-600"
  },
  {
    level: 3,
    title: "Executive Suite",
    emoji: "💼",
    description: "Big decisions only",
    color: "from-purple-400 to-purple-600"
  },
  {
    level: 4,
    title: "Penthouse Mogul",
    emoji: "👑",
    description: "Master of the universe",
    color: "from-yellow-300 to-yellow-500"
  }
]

// Money animation components
const FloatingMoney = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ y: 50, opacity: 0, rotate: 0 }}
    animate={{ 
      y: -100, 
      opacity: [0, 1, 1, 0], 
      rotate: [0, 15, -15, 0],
      x: [0, 10, -5, 0]
    }}
    transition={{ 
      duration: 3, 
      delay,
      ease: "easeOut"
    }}
    className="absolute text-2xl pointer-events-none z-20"
    style={{
      left: `${20 + Math.random() * 60}%`,
      top: "80%"
    }}
  >
    💰
  </motion.div>
)

const DollarBill = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ y: 50, opacity: 0, rotate: 0, scale: 0.5 }}
    animate={{ 
      y: -120, 
      opacity: [0, 1, 1, 0], 
      rotate: [0, 180, 360],
      scale: [0.5, 1, 0.8, 0]
    }}
    transition={{ 
      duration: 4, 
      delay,
      ease: "easeOut"
    }}
    className="absolute text-yellow-600 font-bold pointer-events-none z-20"
    style={{
      left: `${10 + Math.random() * 80}%`,
      top: "90%",
      fontSize: '1.5rem'
    }}
  >
    $
  </motion.div>
)

const ChampagnePop = () => (
  <motion.div
    initial={{ scale: 0, rotate: 0 }}
    animate={{ 
      scale: [0, 1.5, 1],
      rotate: [0, 15, -10, 0]
    }}
    transition={{ duration: 1, ease: "backOut" }}
    className="absolute top-4 right-4 text-4xl z-30"
  >
    🍾
  </motion.div>
)

const GoldenConfetti = ({ count = 8 }: { count?: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <motion.div
        key={i}
        initial={{ y: -20, opacity: 1, scale: 1 }}
        animate={{ 
          y: 200, 
          opacity: 0,
          rotate: [0, 180, 360, 540],
          x: [0, Math.random() * 100 - 50]
        }}
        transition={{ 
          duration: 3, 
          delay: i * 0.1,
          ease: "easeOut"
        }}
        className="absolute text-yellow-500 pointer-events-none z-20"
        style={{
          left: `${10 + Math.random() * 80}%`,
          top: "10%"
        }}
      >
        ⭐
      </motion.div>
    ))}
  </>
)

export default function BudgetBracketTowerProgress({
  currentRound,
  gameChoices,
  gameState,
  totalRounds = 5,
  onElevatorAnimation
}: BudgetBracketTowerProgressProps) {
  const [showMoneyRain, setShowMoneyRain] = useState(false)
  const [showChampagne, setShowChampagne] = useState(false)
  const [showGoldenConfetti, setShowGoldenConfetti] = useState(false)
  const [elevatorPosition, setElevatorPosition] = useState(1)
  const [celebrationTrigger, setCelebrationTrigger] = useState(0)

  // Calculate current floor based on completed rounds (4 floors for 5 rounds)
  const completedRounds = gameChoices.length
  const currentFloor = Math.min(Math.ceil((completedRounds + 1) * 4 / 5), 4)
  const correctAnswers = gameChoices.filter(choice => choice.correct).length
  const isPerfectGame = gameState === 'completed' && correctAnswers === totalRounds
  const totalBudgetMastered = gameChoices.length * 500_000_000 // $500M per round for display

  // Trigger elevator animation when round changes
  useEffect(() => {
    if (gameState === 'playing' && currentFloor > elevatorPosition) {
      setElevatorPosition(currentFloor)
      onElevatorAnimation?.(currentFloor)
      
      // Trigger money rain after elevator moves
      setTimeout(() => {
        setShowMoneyRain(true)
        setCelebrationTrigger(prev => prev + 1)
        setTimeout(() => setShowMoneyRain(false), 3000)
      }, 800)
    }
  }, [currentFloor, elevatorPosition, gameState, onElevatorAnimation])

  // Perfect game celebration
  useEffect(() => {
    if (isPerfectGame && !showGoldenConfetti) {
      setTimeout(() => {
        setShowChampagne(true)
        setShowGoldenConfetti(true)
        setTimeout(() => {
          setShowChampagne(false)
          setShowGoldenConfetti(false)
        }, 4000)
      }, 1000)
    }
  }, [isPerfectGame, showGoldenConfetti])

  return (
    <div className="relative bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 rounded-xl p-6 overflow-hidden">
      {/* Background Hollywood elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-4 text-4xl">🎬</div>
        <div className="absolute top-8 right-8 text-3xl">🎭</div>
        <div className="absolute bottom-4 left-8 text-3xl">🎪</div>
        <div className="absolute bottom-8 right-4 text-4xl">💡</div>
      </div>

      {/* Studio Tower Building */}
      <div className="relative z-10">
        {/* Tower Structure */}
        <div className="bg-gradient-to-t from-gray-800 to-gray-600 rounded-t-lg border-2 border-[#d1d2d4] relative" style={{ height: '300px' }}>
          
          {/* Elevator Shaft */}
          <div className="absolute left-4 top-4 bottom-4 w-12 bg-gradient-to-b from-gray-700 to-gray-900 rounded border-2 border-[#d1d2d4]">
            {/* Elevator Car */}
            <motion.div
              className="absolute w-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded border border-yellow-200 flex items-center justify-center text-gray-900 font-bold shadow-lg"
              style={{ height: '45px' }}
              animate={{
                bottom: `${((elevatorPosition - 1) * 50) + 10}px`
              }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                duration: 1.2
              }}
            >
              <span className="text-lg">🎬</span>
            </motion.div>
            
            {/* Elevator shaft lights */}
            {FLOORS.map((floor) => {
              const isCompleted = completedRounds >= floor.level
              const isCurrent = currentFloor === floor.level
              
              return (
                <div
                  key={floor.level}
                  className={`absolute right-1 w-2 h-2 rounded-full ${
                    isCompleted 
                      ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' 
                      : isCurrent 
                        ? 'bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50'
                        : 'bg-gray-600'
                  }`}
                  style={{
                    bottom: `${((floor.level - 1) * 50) + 25}px`
                  }}
                />
              )
            })}
          </div>

          {/* Floors */}
          <div className="ml-20 h-full">
            {FLOORS.map((floor, index) => {
              const isCompleted = completedRounds >= floor.level
              const isCurrent = currentFloor === floor.level
              const roundChoice = gameChoices.find(c => c.round === floor.level)
              const isCorrect = roundChoice?.correct
              
              return (
                <motion.div
                  key={floor.level}
                  className={`relative h-12 border-b border-[#d1d2d4] flex items-center justify-between px-4 ${
                    isCompleted 
                      ? `bg-gradient-to-r ${floor.color} text-white shadow-inner` 
                      : isCurrent
                        ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-gray-900 animate-pulse shadow-inner'
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300'
                  }`}
                  style={{
                    bottom: `${(floor.level - 1) * 50}px`,
                    position: 'absolute',
                    width: 'calc(100% - 5rem)',
                    borderRadius: index === FLOORS.length - 1 ? '0.5rem 0.5rem 0 0' : '0'
                  }}
                  initial={{ opacity: 0.7 }}
                  animate={{ 
                    opacity: isCompleted || isCurrent ? 1 : 0.7,
                    scale: isCurrent ? 1.02 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Office Window */}
                  <div className="flex items-center space-x-3">
                    <motion.span 
                      className="text-2xl"
                      animate={isCurrent ? { rotate: [0, 10, -10, 0] } : {}}
                      transition={{ duration: 2, repeat: isCurrent ? Infinity : 0 }}
                    >
                      {floor.emoji}
                    </motion.span>
                    <div>
                      <div className="font-bold text-sm">{floor.title}</div>
                      <div className="text-xs opacity-75">{floor.description}</div>
                    </div>
                  </div>
                  
                  {/* Floor Status */}
                  <div className="flex items-center space-x-2">
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                      >
                        {isCorrect ? (
                          <div className="text-green-300 font-bold">🟩</div>
                        ) : (
                          <div className="text-red-300 font-bold">🟥</div>
                        )}
                      </motion.div>
                    )}
                    
                    {isCurrent && gameState === 'playing' && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-yellow-300"
                      >
                        ⭐
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Studio Lights */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <motion.div
              animate={{ 
                rotateY: [0, 360],
                scale: isPerfectGame ? [1, 1.2, 1] : 1
              }}
              transition={{ 
                rotateY: { duration: 4, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity }
              }}
              className="text-4xl"
            >
              💡
            </motion.div>
          </div>
        </div>

        {/* Budget Counter */}
        <div className="mt-4 bg-gradient-to-r from-yellow-800 to-yellow-900 rounded-lg p-4 border border-yellow-600">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-yellow-100">
              <DollarSign className="w-5 h-5" />
              <span className="text-lg font-bold font-mono">
                Budget Mastered: ${(totalBudgetMastered / 1_000_000).toFixed(1)}M
              </span>
            </div>
            <div className="text-sm text-yellow-300 mt-1">
              {correctAnswers}/{completedRounds} Correct Calls • Floor {elevatorPosition}
            </div>
          </div>
        </div>

        {/* Perfect Game Achievement */}
        {isPerfectGame && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-lg p-4 border-2 border-yellow-400 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-yellow-100">
              <Trophy className="w-6 h-6" />
              <span className="text-xl font-bold">HOLLYWOOD MOGUL!</span>
              <Crown className="w-6 h-6" />
            </div>
            <div className="text-sm text-yellow-200 mt-1">
              Perfect Producer Status Achieved! 🎬
            </div>
          </motion.div>
        )}
      </div>

      {/* Money Rain Animation */}
      <AnimatePresence>
        {showMoneyRain && (
          <>
            {Array.from({ length: 6 }, (_, i) => (
              <FloatingMoney key={`money-${celebrationTrigger}-${i}`} delay={i * 0.2} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <DollarBill key={`dollar-${celebrationTrigger}-${i}`} delay={i * 0.1} />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Perfect Game Celebration */}
      <AnimatePresence>
        {showChampagne && <ChampagnePop />}
        {showGoldenConfetti && <GoldenConfetti count={12} />}
      </AnimatePresence>
    </div>
  )
}