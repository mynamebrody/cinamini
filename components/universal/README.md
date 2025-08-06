# Cinamini Universal Achievement & Celebration System

A unified celebration and achievement system that brings consistency to the cinamini experience while preserving each game's unique personality.

## 🎯 Overview

This system provides:
- **Unified Achievement Tracking**: Cross-game achievements and statistics
- **Theme-Consistent Celebrations**: Each game maintains its personality with shared mechanics
- **Automatic Progress Tracking**: Games report events, system handles the rest
- **Rich Visual Feedback**: Confetti and haptic feedback
- **Easy Integration**: Simple hooks and components for existing games

## 🚀 Quick Start

### 1. Wrap Your App

```tsx
import { AchievementSystemProvider } from '@/components/universal'

export default function App({ children }) {
  return (
    <AchievementSystemProvider>
      {children}
    </AchievementSystemProvider>
  )
}
```

### 2. Use in Game Components

```tsx
import { useGameAchievements, useCelebration } from '@/components/universal'

function YourGameComponent() {
  const { reportGameCompleted, reportPerfectScore } = useGameAchievements('cast-climb')
  const { celebrate } = useCelebration()
  
  const handleGameWon = async (isPerfect: boolean) => {
    // Report to achievement system
    await reportGameCompleted({ isPerfect })
    
    // Trigger celebration
    if (isPerfect) {
      celebrate('cast-climb', 'gold')
    }
  }
  
  return (
    // Your game UI
  )
}
```

### 3. Display Achievements

```tsx
import { AchievementGrid, CrossGameStats } from '@/components/universal'

function StatsPage() {
  const { achievements } = useAchievementSystem()
  
  return (
    <div>
      <CrossGameStats />
      <AchievementGrid 
        achievements={achievements} 
        showProgress={true}
      />
    </div>
  )
}
```

## 🎮 Game Themes

Each game has its own theme configuration:

- **Cast Climb** 🎭: Orange colors, theater emojis
- **Retitled** 🌍: Blue colors, travel emojis
- **Budget Bracket** 💰: Green colors, money emojis
- **Poster Pixels** 🖼️: Purple colors, art emojis
- **Universal** 🎬: Cinema red, movie emojis

## 🏆 Achievement Types

### Performance Achievements
- Perfect games, quick completion times, skill demonstrations

### Exploration Achievements  
- Movies encountered, countries visited, content discovered

### Streak Achievements
- Daily play streaks, consecutive wins, consistency rewards

### Milestone Achievements
- Play counts, cross-game objectives, major accomplishments

### Social Achievements
- Sharing, community features (future)

## 🎉 Celebration System

The system automatically provides:

- **Visual Effects**: Theme-specific confetti and particle systems
- **Haptic Feedback**: Mobile vibration patterns
- **Achievement Notifications**: Toast notifications for new unlocks

### Celebration Intensities

- **Light**: Bronze achievements, small wins
- **Medium**: Silver achievements, regular progress
- **Heavy**: Gold/Platinum achievements, major milestones

## 📊 Cross-Game Statistics

The system tracks:
- Total games played across all types
- Daily play streaks
- Perfect game counts
- Movies encountered
- Achievement scores
- Favorite game preferences

## 🔧 API Reference

### useGameAchievements(gameTheme)

```tsx
const {
  gameAchievements,        // Achievements for this game
  reportGameCompleted,     // Report game completion
  reportPerfectScore,      // Report perfect performance
  reportMovieEncountered   // Track movie discoveries
} = useGameAchievements('cast-climb')
```

### useCelebration()

```tsx
const {
  celebrate,          // Full celebration with effects
  triggerHaptic,      // Haptic only
  createConfetti      // Visual only
} = useCelebration()
```

### useAchievementSystem()

```tsx
const {
  achievements,           // All achievements
  unlockedAchievements,   // Only unlocked ones
  crossGameStats,         // Cross-game statistics
  totalScore,             // Combined achievement score
  updateProgress,         // Manual progress updates
  isLoading              // System initialization status
} = useAchievementSystem()
```

## 🎨 Customization

### Adding New Game Themes

1. Add to `GameTheme` type in `universal-achievements.ts`
2. Add configuration to `GAME_THEMES`
3. Define game-specific achievements
4. Use the new theme in your components

### Custom Achievement Events

```tsx
// Report custom events
await updateProgress({
  gameTheme: 'your-game',
  action: 'custom_action',
  value: 42,
  metadata: { special: true }
})
```

## 🧪 Testing

Visit `/achievements-demo` to:
- Test all celebration effects
- View achievement progress
- See integration examples
- Debug the system

## 📁 File Structure

```
components/universal/
├── index.ts                          # Main exports
├── achievement-system.tsx            # Core system & context
├── achievement-badge.tsx             # Badge components
├── celebration-effects-library.tsx   # Haptic/visual effects
├── universal-confetti.tsx            # Confetti system
├── cross-game-stats.tsx              # Statistics display
├── game-integration-example.tsx      # Integration examples
lib/
└── universal-achievements.ts         # Types & configurations
```

## 🚦 Integration Checklist

For each game:

- [ ] Add achievement event reporting
- [ ] Integrate celebration triggers
- [ ] Test theme-specific effects
- [ ] Verify achievement unlocking
- [ ] Update game stats display
- [ ] Add to cross-game navigation

## 🔮 Future Enhancements

- Backend synchronization
- Social features & leaderboards  
- Custom achievement creation
- Advanced analytics
- Push notifications
- Achievement sharing cards

---

**Ready to make your games more delightful?** Start with the Quick Start guide above and visit `/achievements-demo` to see the system in action!
