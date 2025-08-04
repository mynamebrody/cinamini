"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Calendar, Star, BarChart3, Users, Shield } from "lucide-react"
import { localGameStorage } from "@/lib/local-game-storage"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"

interface GameStats {
  totalGamesPlayed: number
  currentStreak: number
  longestStreak: number
  daysPlayed: number
  favoriteGame: string | null
  gameBreakdown: Record<string, number>
}

const gameDisplayNames: Record<string, string> = {
  'budget-bracket': 'Budget Bracket',
  'retitled': 'Retitled',
  'cast-climb': 'Cast Climb',
  'poster-pixels': 'Poster Pixels'
}

export default function AnonymousStatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = () => {
    try {
      const storageStats = localGameStorage.getStats()
      const allResults = localGameStorage.getAllResults()
      
      // Calculate game breakdown
      const gameBreakdown = allResults.reduce((acc, result) => {
        acc[result.gameId] = (acc[result.gameId] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setStats({
        totalGamesPlayed: storageStats.totalGamesPlayed,
        currentStreak: storageStats.streakData.current,
        longestStreak: storageStats.streakData.longest,
        daysPlayed: localGameStorage.getDaysPlayed(),
        favoriteGame: storageStats.favoriteGame,
        gameBreakdown
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = () => {
    router.push('/auth/sign-up')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-neutral-600">Loading your stats...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!stats || stats.totalGamesPlayed === 0) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">No Stats Yet</h1>
            <p className="text-neutral-600 mb-6">Play some games to see your statistics!</p>
            <Button onClick={() => router.push('/')} variant="primary">
              Start Playing
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-nyt text-3xl font-bold text-neutral-900 mb-2">Your Statistics</h1>
          <p className="text-neutral-600">Local data from your device</p>
        </div>

        {/* Sign-up Nudge Card */}
        <Card className="border-cinema-red bg-gradient-to-b from-red-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-cinema-red flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Your stats are only on this device!</h3>
                <p className="text-neutral-600 mb-4">
                  Create a free account to save your progress forever and unlock additional features:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-cinema-red" />
                    <span className="text-sm">Achievement badges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-cinema-red" />
                    <span className="text-sm">Global leaderboards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cinema-red" />
                    <span className="text-sm">Detailed analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-cinema-red" />
                    <span className="text-sm">Compare with friends</span>
                  </div>
                </div>
                <Button onClick={handleSignUp} variant="primary" className="w-full sm:w-auto">
                  Create Free Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Games Played
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGamesPlayed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {stats.currentStreak}
                {stats.currentStreak > 0 && <span className="text-orange-500">🔥</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Longest Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.longestStreak}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Days Played
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.daysPlayed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Game Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Games Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.gameBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([gameId, count]) => {
                  const displayName = gameDisplayNames[gameId] || gameId
                  const percentage = Math.round((count / stats.totalGamesPlayed) * 100)
                  const isFavorite = gameId === stats.favoriteGame
                  
                  return (
                    <div key={gameId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {displayName}
                          {isFavorite && <span className="ml-2 text-yellow-500">⭐</span>}
                        </span>
                        <span className="text-sm text-neutral-600">{count} plays</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div 
                          className="bg-cinema-red h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Limited Stats Notice */}
        <Card className="bg-neutral-50">
          <CardContent className="p-6 text-center">
            <p className="text-neutral-600 mb-4">
              This is a limited view of your statistics. Sign up to unlock:
            </p>
            <ul className="text-sm text-neutral-600 space-y-1 mb-4">
              <li>• Historical performance charts</li>
              <li>• Success rate by game type</li>
              <li>• Average completion times</li>
              <li>• Comparison with other players</li>
              <li>• And much more!</li>
            </ul>
            <Button variant="outline" onClick={handleSignUp}>
              Unlock Full Statistics
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}