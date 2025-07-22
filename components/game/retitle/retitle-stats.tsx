"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Trophy, Flame, Clock, Target } from "lucide-react"

interface StatsData {
  gamesPlayed: number
  gamesCorrect: number
  accuracy: number
  currentStreak: number
  longestStreak: number
  averageSolveTime: string
  countriesGuessed: string[]
  lastPlayed: string | null
}

interface RetitleStatsProps {
  onClose: () => void
}

// Country flag emojis mapping
const FLAG_EMOJIS: Record<string, string> = {
  'FR': '🇫🇷',
  'ES': '🇪🇸',
  'DE': '🇩🇪',
  'IT': '🇮🇹',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'CN': '🇨🇳',
  'BR': '🇧🇷',
  'RU': '🇷🇺',
  'IN': '🇮🇳'
}

export default function RetitleStats({ onClose }: RetitleStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch("/api/retitled/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error("Error loading stats:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center text-white">
        <p>Loading stats...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-white">
        <p>No stats available yet. Play your first game!</p>
        <Button onClick={onClose} variant="outline" className="mt-4">
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Your Stats</h2>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Games Played */}
        <Card className="p-4 bg-[#1c1c1c] border-white/10">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.gamesPlayed}</p>
              <p className="text-sm text-gray-400">Games Played</p>
            </div>
          </div>
        </Card>

        {/* Accuracy */}
        <Card className="p-4 bg-[#1c1c1c] border-white/10">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.accuracy}%</p>
              <p className="text-sm text-gray-400">Accuracy</p>
            </div>
          </div>
        </Card>

        {/* Current Streak */}
        <Card className="p-4 bg-[#1c1c1c] border-white/10">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
              <p className="text-sm text-gray-400">Current Streak</p>
            </div>
          </div>
        </Card>

        {/* Average Time */}
        <Card className="p-4 bg-[#1c1c1c] border-white/10">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.averageSolveTime}</p>
              <p className="text-sm text-gray-400">Avg Time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <Card className="p-6 bg-[#1c1c1c] border-white/10 space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Longest Streak</p>
          <p className="text-xl font-bold text-white flex items-center gap-2">
            {stats.longestStreak}
            {stats.longestStreak > 0 && <Flame className="w-4 h-4 text-orange-500" />}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">Countries Discovered</p>
          <div className="flex flex-wrap gap-2">
            {stats.countriesGuessed.length > 0 ? (
              stats.countriesGuessed.map((country) => (
                <span key={country} className="text-2xl">
                  {FLAG_EMOJIS[country] || '🏳️'}
                </span>
              ))
            ) : (
              <p className="text-gray-500">None yet</p>
            )}
          </div>
        </div>

        {stats.lastPlayed && (
          <div>
            <p className="text-sm text-gray-400">Last Played</p>
            <p className="text-white">
              {new Date(stats.lastPlayed).toLocaleDateString()}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}