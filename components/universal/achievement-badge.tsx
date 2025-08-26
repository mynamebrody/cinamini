"use client"

import { motion } from "framer-motion"
import { Achievement, AchievementTier, GAME_THEMES } from "@/lib/universal-achievements"
import { cn } from "@/lib/utils"

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'small' | 'medium' | 'large'
  showProgress?: boolean
  animated?: boolean
  onClick?: () => void
  className?: string
}

// Tier-specific styling
const TIER_STYLES = {
  bronze: {
    gradient: 'from-amber-600 to-amber-800',
    ring: 'ring-amber-500/50',
    glow: 'shadow-amber-500/25',
    textColor: 'text-amber-100'
  },
  silver: {
    gradient: 'from-gray-400 to-gray-600',
    ring: 'ring-gray-400/50',
    glow: 'shadow-gray-400/25',
    textColor: 'text-gray-100'
  },
  gold: {
    gradient: 'from-yellow-400 to-yellow-600',
    ring: 'ring-yellow-400/50',
    glow: 'shadow-yellow-400/25',
    textColor: 'text-yellow-100'
  },
  platinum: {
    gradient: 'from-indigo-400 to-indigo-600',
    ring: 'ring-indigo-400/50',
    glow: 'shadow-indigo-400/25',
    textColor: 'text-indigo-100'
  },
  legendary: {
    gradient: 'from-purple-500 via-pink-500 to-purple-500',
    ring: 'ring-purple-400/50',
    glow: 'shadow-purple-400/50',
    textColor: 'text-purple-100'
  }
}

const SIZE_CONFIG = {
  small: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    title: 'text-xs',
    progress: 'text-xs'
  },
  medium: {
    container: 'w-24 h-24',
    icon: 'text-3xl',
    title: 'text-sm',
    progress: 'text-xs'
  },
  large: {
    container: 'w-32 h-32',
    icon: 'text-4xl',
    title: 'text-base',
    progress: 'text-sm'
  }
}

export function AchievementBadge({
  achievement,
  size = 'medium',
  showProgress = false,
  animated = true,
  onClick,
  className
}: AchievementBadgeProps) {
  const tierStyle = TIER_STYLES[achievement.tier]
  const sizeConfig = SIZE_CONFIG[size]
  const gameTheme = GAME_THEMES[achievement.gameTheme]
  
  const progressPercentage = achievement.maxProgress > 0 
    ? (achievement.progress / achievement.maxProgress) * 100 
    : 0

  const badgeContent = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-full transition-all duration-300",
        sizeConfig.container,
        achievement.unlocked 
          ? `bg-gradient-to-br ${tierStyle.gradient} ${tierStyle.ring} ring-2 shadow-lg ${tierStyle.glow}`
          : "bg-gray-600 ring-2 ring-gray-500/50",
        onClick && "cursor-pointer hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      {/* Progress ring for locked achievements */}
      {!achievement.unlocked && showProgress && achievement.maxProgress > 1 && (
        <svg 
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={gameTheme.particleConfig.colors[0]}
            strokeWidth="3"
            strokeDasharray={`${progressPercentage * 2.83} 283`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
      )}
      
      {/* Achievement Icon */}
      <div className={cn(
        "flex items-center justify-center",
        sizeConfig.icon,
        achievement.unlocked ? tierStyle.textColor : "text-gray-400"
      )}>
        {achievement.icon}
      </div>
      
      {/* Tier indicator */}
      {achievement.unlocked && (
        <div className="absolute -top-1 -right-1">
          <TierIndicator tier={achievement.tier} size={size} />
        </div>
      )}
      
      {/* Game theme indicator */}
      <div className="absolute -bottom-1 -right-1">
        <div className={cn(
          "flex items-center justify-center rounded-full",
          "bg-black/50 backdrop-blur-sm border border-white/20",
          size === 'small' ? 'w-5 h-5 text-xs' : size === 'medium' ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-base'
        )}>
          {gameTheme.primaryEmoji}
        </div>
      </div>
    </div>
  )

  const animatedBadge = animated ? (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 15,
        duration: 0.6
      }}
    >
      {badgeContent}
    </motion.div>
  ) : badgeContent

  return (
    <div className="relative">
      {animatedBadge}
      
      {/* Progress text for locked achievements */}
      {!achievement.unlocked && showProgress && (
        <div className={cn(
          "absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center",
          sizeConfig.progress,
          "text-gray-400"
        )}>
          {achievement.maxProgress === 1 ? (
            <span>Not unlocked</span>
          ) : (
            <span>{achievement.progress}/{achievement.maxProgress}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Tier indicator component
function TierIndicator({ tier, size }: { tier: AchievementTier, size: 'small' | 'medium' | 'large' }) {
  const icons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    legendary: '👑'
  }
  
  const sizeClass = {
    small: 'w-4 h-4 text-xs',
    medium: 'w-5 h-5 text-sm',
    large: 'w-6 h-6 text-base'
  }

  return (
    <div className={cn(
      "flex items-center justify-center rounded-full",
      "bg-black/70 backdrop-blur-sm border border-white/30",
      sizeClass[size]
    )}>
      {icons[tier]}
    </div>
  )
}

// Achievement badge grid component
interface AchievementGridProps {
  achievements: Achievement[]
  columns?: number
  size?: 'small' | 'medium' | 'large'
  showProgress?: boolean
  onAchievementClick?: (achievement: Achievement) => void
  className?: string
}

export function AchievementGrid({
  achievements,
  columns = 4,
  size = 'medium',
  showProgress = false,
  onAchievementClick,
  className
}: AchievementGridProps) {
  return (
    <div 
      className={cn(
        "grid gap-4",
        `grid-cols-${columns}`,
        className
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {achievements.map((achievement) => (
        <div key={achievement.id} className="flex flex-col items-center space-y-2">
          <AchievementBadge
            achievement={achievement}
            size={size}
            showProgress={showProgress}
            onClick={() => onAchievementClick?.(achievement)}
          />
          
          {/* Achievement title */}
          <div className="text-center max-w-20">
            <h4 className={cn(
              "font-semibold",
              size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base',
              achievement.unlocked ? 'text-white' : 'text-gray-400'
            )}>
              {achievement.title}
            </h4>
            
            {size !== 'small' && (
              <p className={cn(
                "text-xs mt-1",
                achievement.unlocked ? 'text-gray-300' : 'text-gray-500'
              )}>
                {achievement.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Animated achievement unlock notification
interface AchievementUnlockProps {
  achievement: Achievement
  show: boolean
  onComplete?: () => void
}

export function AchievementUnlockNotification({
  achievement,
  show,
  onComplete
}: AchievementUnlockProps) {
  if (!show) return null

  return (
    <motion.div
      initial={{ scale: 0, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0, y: -50, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="fixed bottom-8 right-8 z-50 max-w-sm"
    >
      <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center space-x-4">
          <AchievementBadge 
            achievement={achievement} 
            size="medium" 
            animated={true}
          />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-semibold text-yellow-400">Achievement Unlocked!</span>
              <span className="text-xs text-gray-400">🎉</span>
            </div>
            
            <h4 className="font-bold text-white text-sm">
              {achievement.title}
            </h4>
            
            <p className="text-xs text-gray-300 mt-1">
              {achievement.description}
            </p>
          </div>
        </div>
        
        <motion.button
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  )
}
