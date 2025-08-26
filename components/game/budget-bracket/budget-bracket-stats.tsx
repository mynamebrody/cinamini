"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, 
  Target, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  BarChart3,
  Award,
  Flame
} from "lucide-react"
import { type BudgetBracketStats } from "@/lib/budget-bracket-client"

export default function BudgetBracketStats() {
  const [stats, setStats] = useState<BudgetBracketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/budget-bracket/stats')
      
      if (!response.ok) {
        throw new Error('Failed to load stats')
      }

      const statsData: BudgetBracketStats = await response.json()
      setStats(statsData)
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

  const accuracyPercentage = stats.games_played > 0 
    ? Math.round((stats.perfect_games / stats.games_played) * 100) 
    : 0

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return "🔥"
    if (streak >= 3) return "⚡"
    if (streak >= 1) return "✨"
    return "💫"
  }

  const getPerformanceLevel = (avgRounds: number) => {
    if (avgRounds >= 4.5) return { label: "Master Producer", color: "text-yellow-600", icon: Trophy }
    if (avgRounds >= 3.5) return { label: "Senior Producer", color: "text-blue-600", icon: Award }
    if (avgRounds >= 2.5) return { label: "Producer", color: "text-green-600", icon: Target }
    if (avgRounds >= 1.5) return { label: "Assistant Producer", color: "text-purple-600", icon: TrendingUp }
    return { label: "Intern", color: "text-gray-600", icon: BarChart3 }
  }

  const performance = getPerformanceLevel(stats.average_round_reached)
  const PerformanceIcon = performance.icon

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="px-4 pb-4 pt-6 text-center">
            <div className="text-2xl font-bold">{stats.games_played}</div>
            <div className="text-sm text-muted-foreground">Games Played</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="px-4 pb-4 pt-6 text-center">
            <div className="text-2xl font-bold">{stats.perfect_games}</div>
            <div className="text-sm text-muted-foreground">Perfect Games</div>
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
              <div className="text-lg font-semibold">{stats.best_streak}</div>
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
              Avg: {stats.average_round_reached.toFixed(1)}/5 rounds
            </div>
          </div>
          
          {/* Progress toward next level */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to next level</span>
              <span>{Math.min(100, Math.round((stats.average_round_reached / 5) * 100))}%</span>
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
                style={{ width: `${Math.min(100, (stats.average_round_reached / 5) * 100)}%` }}
              ></div>
            </div>
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
              <span className="text-muted-foreground">Perfect Game Rate:</span>
              <span className="font-medium">{accuracyPercentage}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Rounds Won:</span>
              <span className="font-medium">{stats.total_rounds_won}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Rounds/Game:</span>
              <span className="font-medium">{stats.average_round_reached.toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between">
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
                  <DollarSign className="w-3 h-3 mr-1" />
                  First Budget
                </Badge>
              )}
              
              {stats.perfect_games >= 1 && (
                <Badge variant="outline" className="text-xs">
                  <Trophy className="w-3 h-3 mr-1" />
                  Perfect Producer
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
              
              {stats.best_streak >= 7 && (
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Streak Master
                </Badge>
              )}

              {stats.total_rounds_won >= 50 && (
                <Badge variant="outline" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  Budget Expert
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivational Message */}
      {stats.games_played > 0 && (
        <Card>
          <CardContent className="px-4 pb-4 pt-6 text-center">
            <div className="text-sm text-muted-foreground">
              {stats.current_streak === 0 && stats.games_played > 0 ? (
                "Ready for a comeback? Start a new streak today! 💪"
              ) : stats.average_round_reached < 2 ? (
                "Keep practicing! Movie budgets can be tricky to guess. 🎬"
              ) : stats.average_round_reached >= 4 ? (
                "You're a budget mastermind! Keep up the excellent work! 🌟"
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