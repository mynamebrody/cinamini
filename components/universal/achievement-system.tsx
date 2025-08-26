"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import {
  Achievement,
  AchievementEvent,
  AchievementManager,
  AchievementProgress,
  CrossGameStats,
  GameTheme,
  UNIVERSAL_ACHIEVEMENTS,
  calculateAchievementScore
} from "@/lib/universal-achievements"
import { AchievementUnlockNotification } from "./achievement-badge"
import { CelebrationLibrary } from "./celebration-effects-library"

// Achievement System Context
interface AchievementSystemContextType {
  achievements: Achievement[]
  unlockedAchievements: Achievement[]
  pendingAchievements: Achievement[]
  crossGameStats: CrossGameStats
  totalScore: number
  updateProgress: (event: AchievementEvent) => Promise<Achievement[]>
  getAchievementsByGame: (gameTheme: GameTheme) => Achievement[]
  getAchievementProgress: (achievementId: string) => AchievementProgress | null
  isLoading: boolean
}

const AchievementSystemContext = createContext<AchievementSystemContextType | null>(null)

// Local storage keys
const STORAGE_KEYS = {
  achievements: 'cinamini_achievements',
  crossGameStats: 'cinamini_cross_game_stats',
  lastUpdated: 'cinamini_achievements_last_updated'
}

// Achievement Manager Implementation
class LocalAchievementManager implements AchievementManager {
  private achievements: Map<string, Achievement> = new Map()
  private progress: Map<string, AchievementProgress> = new Map()
  private crossGameStats: CrossGameStats
  private listeners: ((achievements: Achievement[]) => void)[] = []

  constructor() {
    // Initialize with default achievements
    UNIVERSAL_ACHIEVEMENTS.forEach(achievement => {
      this.achievements.set(achievement.id, { ...achievement })
    })

    // Initialize cross-game stats
    this.crossGameStats = {
      totalGamesPlayed: 0,
      totalDaysActive: 0,
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      gamesPlayedToday: [],
      perfectGamesCount: 0,
      totalMoviesEncountered: 0,
      averageCompletionTime: 0,
      favoriteGameTheme: 'universal',
      lastPlayedDate: new Date()
    }
  }

  async updateProgress(event: AchievementEvent): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = []

    // Update cross-game stats
    await this.updateCrossGameStats(event)

    // Check each achievement for progress updates
    for (const [id, achievement] of this.achievements) {
      if (achievement.unlocked) continue

      let progressUpdated = false
      let currentProgress = achievement.progress

      // Update progress based on event type and achievement criteria
      switch (event.action) {
        case 'game_completed':
          if (this.shouldUpdateForGameCompleted(achievement, event)) {
            currentProgress = Math.min(currentProgress + 1, achievement.maxProgress)
            progressUpdated = true
          }
          break

        case 'perfect_score':
          if (this.shouldUpdateForPerfectScore(achievement, event)) {
            currentProgress = Math.min(currentProgress + 1, achievement.maxProgress)
            progressUpdated = true
          }
          break

        case 'streak_updated':
          if (this.shouldUpdateForStreak(achievement, event)) {
            currentProgress = event.value || 0
            progressUpdated = true
          }
          break

        case 'movie_encountered':
          if (this.shouldUpdateForMovieEncountered(achievement, event)) {
            currentProgress = Math.min(currentProgress + 1, achievement.maxProgress)
            progressUpdated = true
          }
          break

        case 'country_visited':
          if (this.shouldUpdateForCountryVisited(achievement)) {
            currentProgress = Math.min(currentProgress + 1, achievement.maxProgress)
            progressUpdated = true
          }
          break

        case 'budget_estimated':
          if (this.shouldUpdateForBudgetEstimated(achievement)) {
            currentProgress = Math.min(currentProgress + (event.value || 0), achievement.maxProgress)
            progressUpdated = true
          }
          break
      }

      if (progressUpdated) {
        // Update achievement progress
        achievement.progress = currentProgress
        
        // Check if achievement is now unlocked
        if (currentProgress >= achievement.maxProgress && !achievement.unlocked) {
          achievement.unlocked = true
          achievement.dateUnlocked = new Date()
          unlockedAchievements.push(achievement)
        }

        // Update progress tracking
        this.progress.set(id, {
          userId: 'local', // For local storage, we use a placeholder
          achievementId: id,
          progress: currentProgress,
          unlocked: achievement.unlocked,
          dateUnlocked: achievement.dateUnlocked,
          lastUpdated: new Date()
        })
      }
    }

    // Save progress
    await this.saveProgress()

    // Notify listeners
    this.listeners.forEach(listener => listener(unlockedAchievements))

    return unlockedAchievements
  }

  private async updateCrossGameStats(event: AchievementEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const lastPlayedDate = this.crossGameStats.lastPlayedDate.toISOString().split('T')[0]

    // Update games played today
    if (!this.crossGameStats.gamesPlayedToday.includes(event.gameTheme)) {
      this.crossGameStats.gamesPlayedToday.push(event.gameTheme)
    }

    // Update daily streak
    if (today !== lastPlayedDate) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      if (lastPlayedDate === yesterday) {
        this.crossGameStats.currentDailyStreak += 1
      } else {
        this.crossGameStats.currentDailyStreak = 1
      }
      
      this.crossGameStats.longestDailyStreak = Math.max(
        this.crossGameStats.longestDailyStreak,
        this.crossGameStats.currentDailyStreak
      )
      
      this.crossGameStats.totalDaysActive += 1
    }

    // Update other stats based on event
    if (event.action === 'game_completed') {
      this.crossGameStats.totalGamesPlayed += 1
    }
    
    if (event.action === 'perfect_score') {
      this.crossGameStats.perfectGamesCount += 1
    }
    
    if (event.action === 'movie_encountered') {
      this.crossGameStats.totalMoviesEncountered += 1
    }

    this.crossGameStats.lastPlayedDate = new Date()
  }

  // Achievement condition checkers
  private shouldUpdateForGameCompleted(achievement: Achievement, event: AchievementEvent): boolean {
    if (achievement.category !== 'milestone' && achievement.category !== 'performance') return false
    
    // Universal achievements apply to all games
    if (achievement.gameTheme === 'universal') return true
    
    // Game-specific achievements
    return achievement.gameTheme === event.gameTheme
  }

  private shouldUpdateForPerfectScore(achievement: Achievement, event: AchievementEvent): boolean {
    if (achievement.category !== 'performance') return false
    if (achievement.id === 'perfectionist' || achievement.id === 'cast-climb-first-guess') return true
    
    return achievement.gameTheme === event.gameTheme && achievement.title.includes('perfect')
  }

  private shouldUpdateForStreak(achievement: Achievement, event: AchievementEvent): boolean {
    if (achievement.category !== 'streak') return false
    
    const streakValue = event.value || 0
    
    // Daily streak achievements
    if (achievement.id.includes('daily-streak')) {
      return streakValue >= achievement.maxProgress
    }
    
    // Game-specific streaks
    return achievement.gameTheme === event.gameTheme
  }

  private shouldUpdateForMovieEncountered(achievement: Achievement, event: AchievementEvent): boolean {
    return achievement.id === 'movie-buff' || 
           (achievement.category === 'exploration' && achievement.gameTheme === event.gameTheme)
  }

  private shouldUpdateForCountryVisited(achievement: Achievement): boolean {
    return achievement.gameTheme === 'retitled' && achievement.category === 'exploration'
  }

  private shouldUpdateForBudgetEstimated(achievement: Achievement): boolean {
    return achievement.id === 'budget-bracket-banker'
  }

  getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked)
  }

  getPendingAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => !a.unlocked && a.progress > 0)
  }

  getAchievementProgress(achievementId: string): AchievementProgress | null {
    return this.progress.get(achievementId) || null
  }

  getCrossGameStats(): CrossGameStats {
    return { ...this.crossGameStats }
  }

  getGameSpecificStats(gameTheme: GameTheme): Record<string, any> {
    const gameAchievements = Array.from(this.achievements.values())
      .filter(a => a.gameTheme === gameTheme)
    
    return {
      totalAchievements: gameAchievements.length,
      unlockedAchievements: gameAchievements.filter(a => a.unlocked).length,
      score: calculateAchievementScore(gameAchievements.filter(a => a.unlocked))
    }
  }

  async saveProgress(): Promise<void> {
    try {
      const achievementData = Array.from(this.achievements.entries()).map(([id, achievement]) => [
        id,
        {
          ...achievement,
          dateUnlocked: achievement.dateUnlocked?.toISOString()
        }
      ])
      
      localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(achievementData))
      localStorage.setItem(STORAGE_KEYS.crossGameStats, JSON.stringify({
        ...this.crossGameStats,
        lastPlayedDate: this.crossGameStats.lastPlayedDate.toISOString()
      }))
      localStorage.setItem(STORAGE_KEYS.lastUpdated, new Date().toISOString())
    } catch (error) {
      console.error('Failed to save achievement progress:', error)
    }
  }

  async loadProgress(): Promise<void> {
    try {
      // Load achievements
      const achievementData = localStorage.getItem(STORAGE_KEYS.achievements)
      if (achievementData) {
        const parsedData = JSON.parse(achievementData)
        parsedData.forEach(([id, achievement]: [string, any]) => {
          if (this.achievements.has(id)) {
            const loadedAchievement = {
              ...achievement,
              dateUnlocked: achievement.dateUnlocked ? new Date(achievement.dateUnlocked) : undefined
            }
            this.achievements.set(id, loadedAchievement)
          }
        })
      }

      // Load cross-game stats
      const statsData = localStorage.getItem(STORAGE_KEYS.crossGameStats)
      if (statsData) {
        const parsedStats = JSON.parse(statsData)
        this.crossGameStats = {
          ...parsedStats,
          lastPlayedDate: new Date(parsedStats.lastPlayedDate)
        }
      }
    } catch (error) {
      console.error('Failed to load achievement progress:', error)
    }
  }

  addListener(listener: (achievements: Achievement[]) => void): void {
    this.listeners.push(listener)
  }

  removeListener(listener: (achievements: Achievement[]) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }
}

// Achievement System Provider
interface AchievementSystemProviderProps {
  children: ReactNode
}

export function AchievementSystemProvider({ children }: AchievementSystemProviderProps) {
  const [manager] = useState(() => new LocalAchievementManager())
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [crossGameStats, setCrossGameStats] = useState<CrossGameStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<Achievement[]>([])

  // Initialize system
  useEffect(() => {
    const initialize = async () => {
      await manager.loadProgress()
      setAchievements(Array.from(manager['achievements'].values()))
      setCrossGameStats(manager.getCrossGameStats())
      setIsLoading(false)
    }

    initialize()

    // Listen for new achievements
    const listener = (newAchievements: Achievement[]) => {
      setNewlyUnlockedAchievements(prev => [...prev, ...newAchievements])
      setAchievements(Array.from(manager['achievements'].values()))
      setCrossGameStats(manager.getCrossGameStats())
      
      // Celebrate new achievements
      newAchievements.forEach(achievement => {
        CelebrationLibrary.celebrateAchievement(achievement.gameTheme, achievement.tier)
      })
    }

    manager.addListener(listener)

    return () => {
      manager.removeListener(listener)
    }
  }, [manager])

  const updateProgress = useCallback(async (event: AchievementEvent): Promise<Achievement[]> => {
    return await manager.updateProgress(event)
  }, [manager])

  const getAchievementsByGameTheme = useCallback((gameTheme: GameTheme): Achievement[] => {
    return achievements.filter(a => a.gameTheme === gameTheme || a.gameTheme === 'universal')
  }, [achievements])

  const getAchievementProgress = useCallback((achievementId: string): AchievementProgress | null => {
    return manager.getAchievementProgress(achievementId)
  }, [manager])

  const contextValue: AchievementSystemContextType = {
    achievements,
    unlockedAchievements: achievements.filter(a => a.unlocked),
    pendingAchievements: achievements.filter(a => !a.unlocked && a.progress > 0),
    crossGameStats: crossGameStats || manager.getCrossGameStats(),
    totalScore: calculateAchievementScore(achievements.filter(a => a.unlocked)),
    updateProgress,
    getAchievementsByGame: getAchievementsByGameTheme,
    getAchievementProgress,
    isLoading
  }

  return (
    <AchievementSystemContext.Provider value={contextValue}>
      {children}
      
      {/* Achievement unlock notifications */}
      {newlyUnlockedAchievements.map((achievement, index) => (
        <AchievementUnlockNotification
          key={`${achievement.id}-${index}`}
          achievement={achievement}
          show={true}
          onComplete={() => {
            setNewlyUnlockedAchievements(prev => 
              prev.filter((_, i) => i !== index)
            )
          }}
        />
      ))}
    </AchievementSystemContext.Provider>
  )
}

// Hook to use achievement system
export function useAchievementSystem() {
  const context = useContext(AchievementSystemContext)
  if (!context) {
    throw new Error('useAchievementSystem must be used within AchievementSystemProvider')
  }
  return context
}

// Convenience hook for game-specific achievements
export function useGameAchievements(gameTheme: GameTheme) {
  const { getAchievementsByGame, updateProgress } = useAchievementSystem()
  
  const gameAchievements = getAchievementsByGame(gameTheme)
  
  const reportGameCompleted = useCallback((metadata?: Record<string, any>) => {
    return updateProgress({
      gameTheme,
      action: 'game_completed',
      metadata
    })
  }, [gameTheme, updateProgress])

  const reportPerfectScore = useCallback((metadata?: Record<string, any>) => {
    return updateProgress({
      gameTheme,
      action: 'perfect_score',
      metadata
    })
  }, [gameTheme, updateProgress])

  const reportMovieEncountered = useCallback((movieId: number) => {
    return updateProgress({
      gameTheme,
      action: 'movie_encountered',
      value: movieId,
      metadata: { movieId }
    })
  }, [gameTheme, updateProgress])

  return {
    gameAchievements,
    reportGameCompleted,
    reportPerfectScore,
    reportMovieEncountered
  }
}
