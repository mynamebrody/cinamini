"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  AchievementSystemProvider,
  useAchievementSystem,
  AchievementGrid,
  CrossGameStats,
  CelebrationTester,
  GameIntegrationExample,
  GAME_THEMES,
  type GameTheme
} from "@/components/universal"

// Demo page content (wrapped in provider)
function AchievementsDemoContent() {
  const [selectedGame, setSelectedGame] = useState<GameTheme>('cast-climb')
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'integration' | 'testing'>('overview')
  
  const { 
    achievements, 
    unlockedAchievements, 
    crossGameStats,
    totalScore,
    isLoading 
  } = useAchievementSystem()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🎬</div>
          <p className="text-white text-xl">Loading Achievement System...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cinema-red to-cinema-red-dark border-b border-gray-700">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold font-funnel-display-bold mb-4">
              🏆 Cinamini Achievement System
            </h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              A unified celebration and achievement system that brings consistency 
              to the cinamini experience while preserving each game's unique personality.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold">{achievements.length}</div>
                <div className="text-sm text-gray-300">Total Achievements</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold">{unlockedAchievements.length}</div>
                <div className="text-sm text-gray-300">Unlocked</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold">{totalScore}</div>
                <div className="text-sm text-gray-300">Total Score</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-2xl font-bold">{crossGameStats.currentDailyStreak}</div>
                <div className="text-sm text-gray-300">Current Streak</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'achievements', label: 'Achievements', icon: '🏆' },
              { id: 'integration', label: 'Integration', icon: '🔧' },
              { id: 'testing', label: 'Testing', icon: '🧪' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cinema-red text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <CrossGameStats />
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Game Theme Selector */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Select Game Theme</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(Object.keys(GAME_THEMES) as GameTheme[]).map(gameTheme => {
                  const theme = GAME_THEMES[gameTheme]
                  return (
                    <button
                      key={gameTheme}
                      onClick={() => setSelectedGame(gameTheme)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedGame === gameTheme
                          ? 'border-cinema-red bg-cinema-red/20'
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-2">{theme.primaryEmoji}</div>
                      <div className="text-sm font-medium">{theme.name}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Achievement Grid */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-6">
                {GAME_THEMES[selectedGame].name} Achievements
              </h3>
              <AchievementGrid
                achievements={achievements.filter(
                  a => a.gameTheme === selectedGame || 
                       (selectedGame === 'universal' ? true : a.gameTheme === 'universal')
                )}
                columns={4}
                size="large"
                showProgress={true}
                onAchievementClick={(achievement) => {
                  console.log('Achievement clicked:', achievement)
                }}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'integration' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Game Integration Example</h3>
              <p className="text-gray-300 mb-6">
                This demonstrates how each game can easily integrate with the unified system.
                Try the buttons to see how achievements and celebrations work together.
              </p>
              
              {/* Game Theme Selector for Integration Demo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Game Theme for Demo:
                </label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value as GameTheme)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  {(Object.keys(GAME_THEMES) as GameTheme[]).filter(t => t !== 'universal').map(gameTheme => (
                    <option key={gameTheme} value={gameTheme}>
                      {GAME_THEMES[gameTheme].name}
                    </option>
                  ))}
                </select>
              </div>
              
              <GameIntegrationExample gameTheme={selectedGame} />
            </div>
            
            {/* Integration Guide */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Integration Guide</h3>
              <div className="prose prose-invert max-w-none">
                <h4>1. Wrap your app with AchievementSystemProvider</h4>
                <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                  <code>{`import { AchievementSystemProvider } from '@/components/universal'

export default function App({ children }) {
  return (
    <AchievementSystemProvider>
      {children}
    </AchievementSystemProvider>
  )
}`}</code>
                </pre>
                
                <h4>2. Use game-specific hooks in your components</h4>
                <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                  <code>{`import { useGameAchievements, useCelebration } from '@/components/universal'

function CastClimbGame() {
  const { reportGameCompleted, reportPerfectScore } = useGameAchievements('cast-climb')
  const { celebrate } = useCelebration()
  
  const handleCorrectGuess = async (isFirstActor) => {
    if (isFirstActor) {
      await reportPerfectScore({ firstGuess: true })
      celebrate('cast-climb', 'gold')
    }
    
    await reportGameCompleted({ guessCount: 1 })
  }
}`}</code>
                </pre>
                
                <h4>3. Achievements and celebrations happen automatically!</h4>
                <p className="text-gray-300">
                  The system will automatically track progress, unlock achievements, 
                  and show celebrations based on the events you report. Each game 
                  maintains its unique visual and audio personality while using 
                  the shared framework.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'testing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Celebration Testing</h3>
              <p className="text-gray-300 mb-6">
                Test the celebration effects for each game theme. 
                Each game has its own colors, emojis, and sound patterns.
              </p>
              <CelebrationTester />
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">System Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">🎨 Theme Consistency</h4>
                  <p className="text-gray-300 text-sm">
                    Each game maintains its unique color palette, emojis, and personality 
                    while using shared celebration mechanics.
                  </p>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">📱 Mobile Optimized</h4>
                  <p className="text-gray-300 text-sm">
                    Optimized for mobile devices with haptic feedback and 
                    responsive visual celebrations.
                  </p>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">📱 Haptic Feedback</h4>
                  <p className="text-gray-300 text-sm">
                    Subtle haptic patterns that enhance the celebration experience 
                    on supported mobile devices.
                  </p>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">🎊 Visual Effects</h4>
                  <p className="text-gray-300 text-sm">
                    Performant confetti and particle systems with game-specific 
                    colors and shapes. Scales based on achievement importance.
                  </p>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">📊 Cross-Game Tracking</h4>
                  <p className="text-gray-300 text-sm">
                    Unified statistics that track progress across all games, 
                    encouraging players to try different game types.
                  </p>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="font-semibable text-lg mb-2">💾 Local Persistence</h4>
                  <p className="text-gray-300 text-sm">
                    Achievement progress is saved locally and can be easily 
                    extended to sync with backend services.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Main demo page with provider wrapper
export default function AchievementsDemoPage() {
  return (
    <AchievementSystemProvider>
      <AchievementsDemoContent />
    </AchievementSystemProvider>
  )
}
