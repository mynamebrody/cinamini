"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, 
  Target, 
  Calendar, 
  TrendingUp, 
  Users,
  BarChart3,
  Award,
  Flame,
  Clock,
  Star,
  Eye
} from "lucide-react"

interface PosterPixelsStats {
  games_played: number
  games_won: number
  current_streak: number
  longest_streak: number
  average_time_ms: number | null
  best_time_ms: number | null
  last_played_date: string | null
  win_rate: number
}

export default function PosterPixelsStats() {
  const [stats, setStats] = useState<PosterPixelsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/poster-pixels/stats')
      
      if (!response.ok) {
        throw new Error('Failed to load stats')
      }
      
      const data = await response.json()
      
      // Calculate additional stats
      const winRate = data.stats.games_played > 0 
        ? Math.round((data.stats.games_won / data.stats.games_played) * 100)
        : 0
      
      setStats({
        ...data.stats,
        win_rate: winRate
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (ms: number | null) => {
    if (!ms) return 'N/A'
    const seconds = Math.round(ms / 1000)
    return `${seconds}s`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return "🔥"
    if (streak >= 3) return "⚡"
    if (streak >= 1) return "✨"
    return "💫"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-500">{error}</p>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No stats available</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.games_played}</div>
            <div className="text-sm text-muted-foreground">Games Played</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.games_won}</div>
            <div className="text-sm text-muted-foreground">Games Won</div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Streak Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {stats.current_streak}
                <span className="text-lg">{getStreakEmoji(stats.current_streak)}</span>
              </div>
              <div className="text-sm text-muted-foreground">Current Streak</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{stats.longest_streak}</div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </div>
          </div>
          
          {stats.current_streak >= 3 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="text-sm text-orange-700 font-medium">
                {stats.current_streak >= 7 ? "You're on fire! 🔥" : "Hot streak! Keep it going! ⚡"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Performance
          </CardTitle>
        </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{stats.win_rate}%</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Best Time</span>
              <span className="font-medium">{formatTime(stats.best_time_ms)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Time</span>
              <span className="font-medium">{formatTime(stats.average_time_ms)}</span>
            </div>
          </CardContent>
        </Card>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Detailed Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Win Rate:</span>
              <span className="font-medium">{stats.win_rate}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Games:</span>
              <span className="font-medium">{stats.games_played}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perfect Rate:</span>
              <span className="font-medium">
                {stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Time:</span>
              <span className="font-medium">{formatTime(stats.average_time_ms)}</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Played:</span>
              <span className="font-medium">
                {formatDate(stats.last_played_date)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Badges */}
      {stats.games_played > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.games_played >= 1 && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Eye className="w-3 h-3 mr-1" />
                  First Look
                </Badge>
              )}
              
              {stats.games_won >= 1 && (
                <Badge className="bg-green-100 text-green-800">
                  <Trophy className="w-3 h-3 mr-1" />
                  Sharp Eye
                </Badge>
              )}
              
              {stats.current_streak >= 3 && (
                <Badge className="bg-orange-100 text-orange-800">
                  <Flame className="w-3 h-3 mr-1" />
                  On Fire
                </Badge>
              )}
              
              {stats.win_rate >= 80 && stats.games_played >= 5 && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Target className="w-3 h-3 mr-1" />
                  Eagle Eye
                </Badge>
              )}
              
              {stats.best_time_ms && stats.best_time_ms <= 10000 && (
                <Badge className="bg-red-100 text-red-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Lightning Fast
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}