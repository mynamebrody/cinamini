// Universal Achievement and Celebration System
// Export all components and utilities for easy importing

// Core Achievement System
export { 
  AchievementSystemProvider, 
  useAchievementSystem, 
  useGameAchievements 
} from './achievement-system'

// Achievement UI Components
export { 
  AchievementBadge, 
  AchievementGrid, 
  AchievementUnlockNotification 
} from './achievement-badge'

// Celebration Effects
export { 
  CelebrationLibrary, 
  useCelebration, 
  QuickSuccessCelebration, 
  EpicAchievementCelebration 
} from './celebration-effects-library'

// Confetti System
export { 
  UniversalConfetti, 
  ConfettiBursts, 
  CanvasConfetti 
} from './universal-confetti'

// Cross-Game Statistics
export { 
  CrossGameStats, 
  AchievementLeaderboard 
} from './cross-game-stats'

// Integration Examples and Testing
export { 
  GameIntegrationExample, 
  CelebrationTester 
} from './game-integration-example'

// Achievement Types and Utilities
export type {
  GameTheme,
  Achievement,
  AchievementTier,
  AchievementCategory,
  AchievementEvent,
  AchievementManager,
  CrossGameStats as CrossGameStatsType,
  HapticPattern
} from '@/lib/universal-achievements'

export {
  GAME_THEMES,
  UNIVERSAL_ACHIEVEMENTS,
  getAchievementsByGame,
  getAchievementsByCategory,
  getAchievementsByTier,
  calculateAchievementScore,
  formatAchievementProgress,
  getCelebrationPattern
} from '@/lib/universal-achievements'
