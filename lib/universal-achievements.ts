// Universal Achievement System for Cinamini
// Provides consistent achievement tracking across all games while preserving unique themes

export type GameTheme = 'cast-climb' | 'retitled' | 'budget-bracket' | 'poster-pixels' | 'universal'

export type AchievementCategory = 'performance' | 'exploration' | 'social' | 'streak' | 'milestone'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error'

// Core Achievement Interface
export interface Achievement {
  id: string
  title: string
  description: string
  gameTheme: GameTheme
  category: AchievementCategory
  tier: AchievementTier
  progress: number
  maxProgress: number
  unlocked: boolean
  dateUnlocked?: Date
  icon: string
  celebrationEmojis: string[]
  soundType: 'ascending' | 'triumphant' | 'magical' | 'cinematic'
}

// Game Theme Configuration
export interface GameThemeConfig {
  name: string
  color: string
  primaryEmoji: string
  celebrationEmojis: string[]
  soundProfile: {
    baseFrequency: number
    progression: 'ascending' | 'triumphant' | 'magical' | 'cinematic'
    instrument: 'sine' | 'triangle' | 'sawtooth' | 'square'
  }
  particleConfig: {
    colors: string[]
    shapes: ('circle' | 'square' | 'triangle')[]
    density: 'light' | 'medium' | 'heavy'
  }
}

// Game Themes
export const GAME_THEMES: Record<GameTheme, GameThemeConfig> = {
  'cast-climb': {
    name: 'Cast Climb',
    color: 'from-orange-500 to-orange-700',
    primaryEmoji: '🎭',
    celebrationEmojis: ['🎭', '🎬', '🍿', '⭐', '🎪', '🎨', '🏆', '✨'],
    soundProfile: {
      baseFrequency: 220,
      progression: 'ascending',
      instrument: 'triangle'
    },
    particleConfig: {
      colors: ['#f97316', '#ea580c', '#fb923c', '#fdba74'],
      shapes: ['circle', 'square'],
      density: 'medium'
    }
  },
  'retitled': {
    name: 'Retitled',
    color: 'from-blue-500 to-blue-700',
    primaryEmoji: '🌍',
    celebrationEmojis: ['🌍', '✈️', '🗺️', '📍', '🧳', '🎫', '🏛️', '⛩️'],
    soundProfile: {
      baseFrequency: 440,
      progression: 'cinematic',
      instrument: 'sine'
    },
    particleConfig: {
      colors: ['#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd'],
      shapes: ['circle', 'triangle'],
      density: 'medium'
    }
  },
  'budget-bracket': {
    name: 'Budget Bracket',
    color: 'from-green-500 to-green-700',
    primaryEmoji: '💰',
    celebrationEmojis: ['💰', '💵', '🏢', '🎬', '🏆', '💎', '🥇', '📈'],
    soundProfile: {
      baseFrequency: 523,
      progression: 'triumphant',
      instrument: 'sawtooth'
    },
    particleConfig: {
      colors: ['#10b981', '#059669', '#34d399', '#6ee7b7'],
      shapes: ['square', 'circle'],
      density: 'heavy'
    }
  },
  'poster-pixels': {
    name: 'Poster Pixels',
    color: 'from-purple-500 to-purple-700',
    primaryEmoji: '🖼️',
    celebrationEmojis: ['🖼️', '🎨', '🖌️', '✨', '🔍', '🏆', '🎪', '🌟'],
    soundProfile: {
      baseFrequency: 659,
      progression: 'magical',
      instrument: 'sine'
    },
    particleConfig: {
      colors: ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd'],
      shapes: ['circle', 'triangle', 'square'],
      density: 'light'
    }
  },
  'universal': {
    name: 'Cinamini',
    color: 'from-cinema-red to-cinema-red-dark',
    primaryEmoji: '🎬',
    celebrationEmojis: ['🎬', '🍿', '⭐', '🏆', '✨', '🎉', '🎊', '🌟'],
    soundProfile: {
      baseFrequency: 349,
      progression: 'cinematic',
      instrument: 'triangle'
    },
    particleConfig: {
      colors: ['#6c0311', '#56020e', '#b28c49', '#9a7b40'],
      shapes: ['circle', 'square', 'triangle'],
      density: 'heavy'
    }
  }
}

// Achievement Definitions
export const UNIVERSAL_ACHIEVEMENTS: Achievement[] = [
  // Daily Streak Achievements
  {
    id: 'daily-streak-7',
    title: 'Weekly Regular',
    description: 'Play any game for 7 consecutive days',
    gameTheme: 'universal',
    category: 'streak',
    tier: 'bronze',
    progress: 0,
    maxProgress: 7,
    unlocked: false,
    icon: '📅',
    celebrationEmojis: ['📅', '⭐', '🔥'],
    soundType: 'ascending'
  },
  {
    id: 'daily-streak-30',
    title: 'Monthly Devotee',
    description: 'Play any game for 30 consecutive days',
    gameTheme: 'universal',
    category: 'streak',
    tier: 'silver',
    progress: 0,
    maxProgress: 30,
    unlocked: false,
    icon: '🗓️',
    celebrationEmojis: ['🗓️', '🏆', '🔥'],
    soundType: 'triumphant'
  },
  {
    id: 'daily-streak-100',
    title: 'Centennial Champion',
    description: 'Play any game for 100 consecutive days',
    gameTheme: 'universal',
    category: 'streak',
    tier: 'gold',
    progress: 0,
    maxProgress: 100,
    unlocked: false,
    icon: '💯',
    celebrationEmojis: ['💯', '👑', '⚡'],
    soundType: 'cinematic'
  },

  // Cross-Game Achievements
  {
    id: 'perfect-quartet',
    title: 'Perfect Quartet',
    description: 'Play all 4 games in a single day',
    gameTheme: 'universal',
    category: 'milestone',
    tier: 'silver',
    progress: 0,
    maxProgress: 4,
    unlocked: false,
    icon: '🎯',
    celebrationEmojis: ['🎯', '🎬', '🏆'],
    soundType: 'triumphant'
  },
  {
    id: 'perfect-week',
    title: 'Perfect Week',
    description: 'Complete all 4 games every day for a week',
    gameTheme: 'universal',
    category: 'milestone',
    tier: 'gold',
    progress: 0,
    maxProgress: 7,
    unlocked: false,
    icon: '⭐',
    celebrationEmojis: ['⭐', '👑', '🌟'],
    soundType: 'cinematic'
  },

  // Performance Achievements  
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Achieve a perfect score in any game',
    gameTheme: 'universal',
    category: 'performance',
    tier: 'bronze',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    icon: '💎',
    celebrationEmojis: ['💎', '✨', '🏆'],
    soundType: 'magical'
  },
  {
    id: 'quick-draw',
    title: 'Quick Draw',
    description: 'Complete any game in under 30 seconds',
    gameTheme: 'universal',
    category: 'performance',
    tier: 'silver',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    icon: '⚡',
    celebrationEmojis: ['⚡', '🎯', '💨'],
    soundType: 'triumphant'
  },

  // Exploration Achievements
  {
    id: 'movie-buff',
    title: 'Movie Buff',
    description: 'Encounter 100 different movies across all games',
    gameTheme: 'universal',
    category: 'exploration',
    tier: 'silver',
    progress: 0,
    maxProgress: 100,
    unlocked: false,
    icon: '🎬',
    celebrationEmojis: ['🎬', '📚', '🏆'],
    soundType: 'cinematic'
  },
  {
    id: 'genre-master',
    title: 'Genre Master',
    description: 'Excel at all game types consistently',
    gameTheme: 'universal',
    category: 'performance',
    tier: 'gold',
    progress: 0,
    maxProgress: 10,
    unlocked: false,
    icon: '🎭',
    celebrationEmojis: ['🎭', '👑', '🌟'],
    soundType: 'cinematic'
  },

  // Game-Specific Achievement Templates
  // Cast Climb
  {
    id: 'cast-climb-first-guess',
    title: 'Opening Act',
    description: 'Guess the movie from just the first actor in Cast Climb',
    gameTheme: 'cast-climb',
    category: 'performance',
    tier: 'gold',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    icon: '🎭',
    celebrationEmojis: ['🎭', '⭐', '🏆'],
    soundType: 'triumphant'
  },
  {
    id: 'cast-climb-streak-10',
    title: 'Leading Star',
    description: 'Win 10 Cast Climb games in a row',
    gameTheme: 'cast-climb',
    category: 'streak',
    tier: 'silver',
    progress: 0,
    maxProgress: 10,
    unlocked: false,
    icon: '⭐',
    celebrationEmojis: ['⭐', '🎬', '🔥'],
    soundType: 'ascending'
  },

  // Retitled
  {
    id: 'retitled-world-traveler',
    title: 'World Traveler',
    description: 'Correctly identify movies from 25 different countries',
    gameTheme: 'retitled',
    category: 'exploration',
    tier: 'gold',
    progress: 0,
    maxProgress: 25,
    unlocked: false,
    icon: '🌍',
    celebrationEmojis: ['🌍', '✈️', '🏆'],
    soundType: 'cinematic'
  },
  {
    id: 'retitled-passport-stamp',
    title: 'Passport Collector',
    description: 'Visit 10 different countries in Retitled',
    gameTheme: 'retitled',
    category: 'exploration',
    tier: 'bronze',
    progress: 0,
    maxProgress: 10,
    unlocked: false,
    icon: '📋',
    celebrationEmojis: ['📋', '🌍', '✈️'],
    soundType: 'ascending'
  },

  // Budget Bracket
  {
    id: 'budget-bracket-mogul',
    title: 'Hollywood Mogul',
    description: 'Achieve 10 perfect games in Budget Bracket',
    gameTheme: 'budget-bracket',
    category: 'performance',
    tier: 'gold',
    progress: 0,
    maxProgress: 10,
    unlocked: false,
    icon: '🏢',
    celebrationEmojis: ['🏢', '💰', '👑'],
    soundType: 'triumphant'
  },
  {
    id: 'budget-bracket-banker',
    title: 'Movie Banker',
    description: 'Correctly estimate budgets worth over $1 billion total',
    gameTheme: 'budget-bracket',
    category: 'milestone',
    tier: 'silver',
    progress: 0,
    maxProgress: 1000000000,
    unlocked: false,
    icon: '💎',
    celebrationEmojis: ['💎', '💰', '📈'],
    soundType: 'triumphant'
  },

  // Poster Pixels
  {
    id: 'poster-pixels-restorer',
    title: 'Master Restorer',
    description: 'Identify 5 movies at maximum blur in Poster Pixels',
    gameTheme: 'poster-pixels',
    category: 'performance',
    tier: 'gold',
    progress: 0,
    maxProgress: 5,
    unlocked: false,
    icon: '🎨',
    celebrationEmojis: ['🎨', '🔍', '✨'],
    soundType: 'magical'
  },
  {
    id: 'poster-pixels-curator',
    title: 'Gallery Curator',
    description: 'Successfully restore 50 movie posters',
    gameTheme: 'poster-pixels',
    category: 'milestone',
    tier: 'silver',
    progress: 0,
    maxProgress: 50,
    unlocked: false,
    icon: '🖼️',
    celebrationEmojis: ['🖼️', '🏛️', '🏆'],
    soundType: 'magical'
  }
]

// Achievement Progress Tracking
export interface AchievementProgress {
  userId: string
  achievementId: string
  progress: number
  unlocked: boolean
  dateUnlocked?: Date
  lastUpdated: Date
}

// Achievement Update Event
export interface AchievementEvent {
  gameTheme: GameTheme
  action: 'game_completed' | 'perfect_score' | 'streak_updated' | 'movie_encountered' | 'country_visited' | 'budget_estimated'
  value?: number
  metadata?: Record<string, any>
}

// Cross-Game Statistics
export interface CrossGameStats {
  totalGamesPlayed: number
  totalDaysActive: number
  currentDailyStreak: number
  longestDailyStreak: number
  gamesPlayedToday: GameTheme[]
  perfectGamesCount: number
  totalMoviesEncountered: number
  averageCompletionTime: number
  favoriteGameTheme: GameTheme
  lastPlayedDate: Date
}

// Achievement Manager Interface
export interface AchievementManager {
  // Core functionality
  updateProgress(event: AchievementEvent): Promise<Achievement[]>
  getUnlockedAchievements(): Achievement[]
  getPendingAchievements(): Achievement[]
  getAchievementProgress(achievementId: string): AchievementProgress | null
  
  // Statistics
  getCrossGameStats(): CrossGameStats
  getGameSpecificStats(gameTheme: GameTheme): Record<string, any>
  
  // Persistence
  saveProgress(): Promise<void>
  loadProgress(): Promise<void>
}

// Utility Functions
export function getAchievementsByGame(gameTheme: GameTheme): Achievement[] {
  return UNIVERSAL_ACHIEVEMENTS.filter(achievement => 
    achievement.gameTheme === gameTheme || achievement.gameTheme === 'universal'
  )
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return UNIVERSAL_ACHIEVEMENTS.filter(achievement => achievement.category === category)
}

export function getAchievementsByTier(tier: AchievementTier): Achievement[] {
  return UNIVERSAL_ACHIEVEMENTS.filter(achievement => achievement.tier === tier)
}

export function calculateAchievementScore(achievements: Achievement[]): number {
  const tierValues = {
    bronze: 10,
    silver: 25,
    gold: 50,
    platinum: 100,
    legendary: 250
  }
  
  return achievements
    .filter(a => a.unlocked)
    .reduce((total, achievement) => total + tierValues[achievement.tier], 0)
}

export function formatAchievementProgress(achievement: Achievement): string {
  if (achievement.unlocked) return 'Unlocked!'
  
  if (achievement.maxProgress === 1) {
    return 'Not yet achieved'
  }
  
  return `${achievement.progress}/${achievement.maxProgress}`
}

// Theme-specific celebration patterns
export function getCelebrationPattern(gameTheme: GameTheme, tier: AchievementTier): {
  intensity: 'light' | 'medium' | 'heavy'
  duration: number
  haptic: HapticPattern
} {
  const basePatterns = {
    bronze: { intensity: 'light' as const, duration: 2000, haptic: 'light' as const },
    silver: { intensity: 'medium' as const, duration: 3000, haptic: 'medium' as const },
    gold: { intensity: 'heavy' as const, duration: 4000, haptic: 'heavy' as const },
    platinum: { intensity: 'heavy' as const, duration: 5000, haptic: 'success' as const },
    legendary: { intensity: 'heavy' as const, duration: 6000, haptic: 'success' as const }
  }
  
  return basePatterns[tier]
}
