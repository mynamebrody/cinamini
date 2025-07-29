"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Loader2, Trophy, Zap, Target, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface PosterPixelStats {
  games_played: number
  games_won: number
  win_percentage: number
  current_streak: number
  max_streak: number
  average_guesses: number
  perfect_games: number // Won in 1 guess
}

export default function PosterPixelStats() {
  const [stats, setStats] = useState<PosterPixelStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production, this would fetch from the API
    // For now, using mock data
    setStats({
      games_played: 0,
      games_won: 0,
      win_percentage: 0,
      current_streak: 0,
      max_streak: 0,
      average_guesses: 0,
      perfect_games: 0
    })
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No stats available yet. Play your first game!</p>
      </div>
    )
  }

  const getPerformanceLevel = (avgGuesses: number): string => {
    if (avgGuesses <= 2) return "Expert"
    if (avgGuesses <= 3) return "Advanced"
    if (avgGuesses <= 4) return "Intermediate"
    return "Beginner"
  }

  const performanceLevel = getPerformanceLevel(stats.average_guesses)

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-background/50 border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Games Played</h3>
            <Trophy className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.games_played}</p>
        </Card>

        <Card className="p-6 bg-background/50 border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Win Rate</h3>
            <Target className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.win_percentage}%</p>
        </Card>

        <Card className="p-6 bg-background/50 border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Current Streak</h3>
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.current_streak}</p>
          <p className="text-xs text-gray-400 mt-1">Best: {stats.max_streak}</p>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="p-6 bg-background/50 border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Details</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Average Guesses</span>
              <span className="text-sm font-medium text-white">
                {stats.average_guesses.toFixed(1)}
              </span>
            </div>
            <Progress 
              value={Math.max(0, Math.round((1 - (stats.average_guesses / 6)) * 100))} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Perfect Games (1 Guess)</span>
              <span className="text-sm font-medium text-white">{stats.perfect_games}</span>
            </div>
            <Progress 
              value={stats.games_played > 0 ? (stats.perfect_games / stats.games_played) * 100 : 0} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Performance Level</span>
              <span className={`text-sm font-medium ${
                performanceLevel === 'Expert' ? 'text-green-400' :
                performanceLevel === 'Advanced' ? 'text-blue-400' :
                performanceLevel === 'Intermediate' ? 'text-yellow-400' :
                'text-orange-400'
              }`}>
                {performanceLevel}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Guess Distribution */}
      <Card className="p-6 bg-background/50 border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Guess Distribution</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((guess) => (
            <div key={guess} className="flex items-center gap-2">
              <span className="text-sm text-gray-400 w-4">{guess}</span>
              <div className="flex-1 h-6 bg-gray-700 rounded-md overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: '0%' }} // This would be calculated from actual data
                />
              </div>
              <span className="text-sm text-gray-400 w-8 text-right">0</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Achievements */}
      <Card className="p-6 bg-background/50 border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg border ${
            stats.games_played >= 1 ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-900/50'
          }`}>
            <p className="text-sm font-medium">First Game</p>
            <p className="text-xs text-gray-400">Play your first game</p>
          </div>
          
          <div className={`p-3 rounded-lg border ${
            stats.perfect_games >= 1 ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-900/50'
          }`}>
            <p className="text-sm font-medium">Sharp Eye</p>
            <p className="text-xs text-gray-400">Win in 1 guess</p>
          </div>
          
          <div className={`p-3 rounded-lg border ${
            stats.current_streak >= 5 ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-900/50'
          }`}>
            <p className="text-sm font-medium">On Fire</p>
            <p className="text-xs text-gray-400">5 game win streak</p>
          </div>
        </div>
      </Card>
    </div>
  )
}