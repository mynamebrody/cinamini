"use client"

import { motion } from "framer-motion"
import { GameTheme, GAME_THEMES } from "@/lib/universal-achievements"
import { useAchievementSystem } from "./achievement-system"
import { AchievementGrid } from "./achievement-badge"
import { cn } from "@/lib/utils"

interface CrossGameStatsProps {
  className?: string
}

export function CrossGameStats({ className }: CrossGameStatsProps) {
  const { 
    crossGameStats, 
    achievements, 
    unlockedAchievements, 
    totalScore,
    isLoading 
  } = useAchievementSystem()

  if (isLoading) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const achievementsByGame = {
    'cast-climb': achievements.filter(a => a.gameTheme === 'cast-climb'),
    'retitled': achievements.filter(a => a.gameTheme === 'retitled'),
    'budget-bracket': achievements.filter(a => a.gameTheme === 'budget-bracket'),
    'poster-pixels': achievements.filter(a => a.gameTheme === 'poster-pixels'),
    'universal': achievements.filter(a => a.gameTheme === 'universal')
  }

  const unlockedByGame = {
    'cast-climb': unlockedAchievements.filter(a => a.gameTheme === 'cast-climb'),
    'retitled': unlockedAchievements.filter(a => a.gameTheme === 'retitled'),
    'budget-bracket': unlockedAchievements.filter(a => a.gameTheme === 'budget-bracket'),
    'poster-pixels': unlockedAchievements.filter(a => a.gameTheme === 'poster-pixels'),
    'universal': unlockedAchievements.filter(a => a.gameTheme === 'universal')
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Overall Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          Your Cinamini Journey
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard
            icon="🎯"
            label="Total Games"
            value={crossGameStats.totalGamesPlayed}
            color="from-blue-500 to-blue-600"
          />
          
          <StatCard
            icon="🔥"
            label="Current Streak"
            value={crossGameStats.currentDailyStreak}
            suffix={crossGameStats.currentDailyStreak === 1 ? ' day' : ' days'}
            color="from-orange-500 to-red-500"
          />
          
          <StatCard
            icon="⭐"
            label="Perfect Games"
            value={crossGameStats.perfectGamesCount}
            color="from-yellow-500 to-yellow-600"
          />
          
          <StatCard
            icon="🏅"
            label="Achievement Score"
            value={totalScore}
            color="from-purple-500 to-purple-600"
          />
        </div>
      </motion.div>

      {/* Game-Specific Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-6">Game Progress</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(achievementsByGame) as (keyof typeof achievementsByGame)[]).map((gameTheme) => {
            if (gameTheme === 'universal') return null
            
            const theme = GAME_THEMES[gameTheme]
            const total = achievementsByGame[gameTheme].length
            const unlocked = unlockedByGame[gameTheme].length
            const percentage = total > 0 ? (unlocked / total) * 100 : 0
            
            return (
              <GameProgressCard
                key={gameTheme}
                gameTheme={gameTheme}
                theme={theme}
                unlocked={unlocked}
                total={total}
                percentage={percentage}
              />
            )
          })}
        </div>
      </motion.div>

      {/* Recent Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-6">Recent Achievements</h3>
        
        {unlockedAchievements.length > 0 ? (
          <AchievementGrid
            achievements={unlockedAchievements
              .sort((a, b) => {
                const dateA = a.dateUnlocked?.getTime() || 0
                const dateB = b.dateUnlocked?.getTime() || 0
                return dateB - dateA
              })
              .slice(0, 8)
            }
            columns={4}
            size="medium"
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-gray-400">No achievements unlocked yet</p>
            <p className="text-gray-500 text-sm mt-2">Keep playing to earn your first achievements!</p>
          </div>
        )}
      </motion.div>

      {/* Achievement Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-6">Achievement Categories</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { category: 'performance', icon: '🏆', label: 'Performance', color: 'from-green-500 to-green-600' },
            { category: 'exploration', icon: '🗺️', label: 'Exploration', color: 'from-blue-500 to-blue-600' },
            { category: 'streak', icon: '🔥', label: 'Streaks', color: 'from-orange-500 to-red-500' },
            { category: 'milestone', icon: '🎨', label: 'Milestones', color: 'from-purple-500 to-purple-600' },
            { category: 'social', icon: '👥', label: 'Social', color: 'from-pink-500 to-pink-600' }
          ].map(({ category, icon, label, color }) => {
            const categoryAchievements = achievements.filter(a => a.category === category)
            const categoryUnlocked = unlockedAchievements.filter(a => a.category === category)
            const percentage = categoryAchievements.length > 0 
              ? (categoryUnlocked.length / categoryAchievements.length) * 100 
              : 0
            
            return (
              <div key={category} className="text-center">
                <div className={cn(
                  "w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl text-white mb-3",
                  `bg-gradient-to-br ${color}`
                )}>
                  {icon}
                </div>
                <h4 className="font-semibold text-white text-sm">{label}</h4>
                <p className="text-xs text-gray-400 mt-1">
                  {categoryUnlocked.length}/{categoryAchievements.length}
                </p>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                  <div 
                    className={cn("h-1.5 rounded-full bg-gradient-to-r", color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

// Individual stat card component
interface StatCardProps {
  icon: string
  label: string
  value: number
  suffix?: string
  color: string
}

function StatCard({ icon, label, value, suffix = '', color }: StatCardProps) {
  return (
    <div className={cn(
      "bg-gradient-to-br rounded-lg p-4 text-white",
      color
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <motion.span 
          className="text-2xl font-bold"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          {value.toLocaleString()}{suffix}
        </motion.span>
      </div>
      <p className="text-sm opacity-90">{label}</p>
    </div>
  )
}

// Game progress card component
interface GameProgressCardProps {
  gameTheme: GameTheme
  theme: any
  unlocked: number
  total: number
  percentage: number
}

function GameProgressCard({ theme, unlocked, total, percentage }: GameProgressCardProps) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{theme.primaryEmoji}</span>
          <span className="font-semibold text-white text-sm">{theme.name}</span>
        </div>
        <span className="text-xs text-gray-400">{unlocked}/{total}</span>
      </div>
      
      <div className="mb-2">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div 
            className={cn("h-2 rounded-full bg-gradient-to-r", theme.color)}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>
      
      <p className="text-xs text-gray-400">
        {percentage.toFixed(0)}% complete
      </p>
    </div>
  )
}

// Leaderboard component (for future social features)
export function AchievementLeaderboard() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">🏅</span>
        Leaderboard
      </h3>
      
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-gray-400">Coming Soon!</p>
        <p className="text-gray-500 text-sm mt-2">
          Compete with friends and see how you rank against other movie buffs.
        </p>
      </div>
    </div>
  )
}
