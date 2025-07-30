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
  Star
} from "lucide-react"

interface CastClimbStats {
  games_played: number
  games_won: number
  current_streak: number
  longest_streak: number
  total_guesses: number
  perfect_games: number
  average_actors_revealed: number
  average_solve_time_ms: number | null
  best_solve_time_ms: number | null
  last_played_date: string | null
  accuracy: number
  win_rate: number
}

export default function CastClimbStats() {
  const [stats, setStats] = useState<CastClimbStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cast-climb/stats')
      
      if (!response.ok) {
        throw new Error('Failed to load stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error loading stats:', error)
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
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

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500">{error || 'No statistics available'}</p>
        </CardContent>
      </Card>
    )
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return "🔥"
    if (streak >= 3) return "⚡"
    if (streak >= 1) return "✨"
    return "💫"
  }

  const getPerformanceLevel = (avgActors: number) => {
    if (avgActors <= 1.5) return { label: "Casting Director", color: "text-yellow-600", icon: Trophy }
    if (avgActors <= 2.5) return { label: "Film Buff", color: "text-blue-600", icon: Award }
    if (avgActors <= 3.5) return { label: "Movie Fan", color: "text-green-600", icon: Target }
    if (avgActors <= 4.5) return { label: "Cinema Explorer", color: "text-purple-600", icon: TrendingUp }
    return { label: "Movie Novice", color: "text-gray-600", icon: BarChart3 }
  }

  const performance = getPerformanceLevel(stats.average_actors_revealed)
  const PerformanceIcon = performance.icon

  const formatTime = (ms: number | null) => {
    if (!ms) return "N/A"
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
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

      {/* Performance Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PerformanceIcon className={`w-5 h-5 ${performance.color}`} />
            Performance Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={`text-sm ${performance.color}`}>
              {performance.label}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Avg: {stats.average_actors_revealed.toFixed(1)} actors revealed
            </div>
          </div>
          
          {/* Progress visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Efficiency (fewer actors = better)</span>
              <span>{Math.max(0, Math.round((1 - (stats.average_actors_revealed / 4)) * 100))}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  performance.color.includes('yellow') ? 'bg-yellow-500' :
                  performance.color.includes('blue') ? 'bg-blue-500' :
                  performance.color.includes('green') ? 'bg-green-500' :
                  performance.color.includes('purple') ? 'bg-purple-500' :
                  'bg-gray-500'
                }`}
                style={{ width: `${Math.max(0, Math.round((1 - (stats.average_actors_revealed / 4)) * 100))}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perfect Games & Time Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div className="text-2xl font-bold">{stats.perfect_games}</div>
            </div>
            <div className="text-sm text-muted-foreground">Perfect Games</div>
            <div className="text-xs text-muted-foreground mt-1">
              (Guessed with 1 actor)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">{formatTime(stats.best_solve_time_ms)}</div>
            </div>
            <div className="text-sm text-muted-foreground">Best Time</div>
          </CardContent>
        </Card>
      </div>

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
              <span className="text-muted-foreground">Total Guesses:</span>
              <span className="font-medium">{stats.total_guesses}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perfect Rate:</span>
              <span className="font-medium">
                {stats.games_played > 0 ? Math.round((stats.perfect_games / stats.games_played) * 100) : 0}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Time:</span>
              <span className="font-medium">{formatTime(stats.average_solve_time_ms)}</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Played:</span>
              <span className="font-medium">
                {stats.last_played_date 
                  ? new Date(stats.last_played_date).toLocaleDateString()
                  : 'Never'
                }
              </span>
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-3">Achievements</div>
            <div className="flex flex-wrap gap-2">
              {stats.games_played >= 1 && (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  First Cast
                </Badge>
              )}
              
              {stats.perfect_games >= 1 && (
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Perfect Guess
                </Badge>
              )}
              
              {stats.current_streak >= 3 && (
                <Badge variant="outline" className="text-xs">
                  <Flame className="w-3 h-3 mr-1" />
                  On Fire
                </Badge>
              )}
              
              {stats.games_played >= 7 && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Weekly Player
                </Badge>
              )}
              
              {stats.longest_streak >= 7 && (
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Streak Master
                </Badge>
              )}

              {stats.perfect_games >= 5 && (
                <Badge variant="outline" className="text-xs">
                  <Trophy className="w-3 h-3 mr-1" />
                  Cast Expert
                </Badge>
              )}

              {stats.average_actors_revealed <= 1.5 && stats.games_played >= 5 && (
                <Badge variant="outline" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  Casting Director
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivational Message */}
      {stats.games_played > 0 && (
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground">
              {stats.current_streak === 0 && stats.games_played > 0 ? (
                "Ready for a comeback? Start a new streak today! 💪"
              ) : stats.average_actors_revealed > 3.5 ? (
                "Keep practicing! Movie casts can be tricky to guess. 🎬"
              ) : stats.average_actors_revealed <= 1.5 ? (
                "You're a casting mastermind! Keep up the excellent work! 🌟"
              ) : (
                "You're getting better! Keep playing to improve your skills! 📈"
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}