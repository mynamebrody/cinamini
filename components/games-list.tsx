"use client"

import { useState, useEffect } from "react"
import GameCard from "./game-card"
import { Loader2 } from "lucide-react"
import { localGameStorage } from "@/lib/local-game-storage"

interface Game {
  game_id: string
  display_name: string
  description: string
  hasPlayedToday: boolean
}

interface GamesListProps {
  isAuthenticated: boolean
}

// Define which games should be featured (left, center, right)
const FEATURED_GAMES = ['retitled', 'budget-bracket', 'cast-climb']

// Game emoji and color mappings
const GAME_STYLES: Record<string, { emoji: string; bgColor: string; textColor?: string }> = {
  'budget-bracket': { emoji: '💰', bgColor: '#22c55e' }, // Green
  'retitled': { emoji: '🌍', bgColor: '#3b82f6' }, // Blue
  'cast-climb': { emoji: '🎭', bgColor: '#f59e0b' }, // Orange
  'poster-pixels': { emoji: '🖼️', bgColor: '#8b5cf6' }, // Purple
  // Default for any new games
  'default': { emoji: '🎬', bgColor: '#6b7280' } // Gray
}

export default function GamesList({ isAuthenticated }: GamesListProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/games")
      if (!response.ok) {
        throw new Error("Failed to load games")
      }
      
      const data = await response.json()
      
      // For anonymous users, check local storage for has_played status
      if (!isAuthenticated) {
        const gamesWithLocalStatus = (data.games || []).map((game: Game) => ({
          ...game,
          hasPlayedToday: localGameStorage.hasPlayedToday(game.game_id)
        }))
        setGames(gamesWithLocalStatus)
      } else {
        setGames(data.games || [])
      }
    } catch (err) {
      console.error("Error loading games:", err)
      setError("Failed to load games. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cinema-red animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading today's puzzles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-700 font-medium mb-2">Unable to load games</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            onClick={loadGames}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">
            No Games Available
          </h3>
          <p className="text-neutral-600">
            Check back soon for new movie puzzles!
          </p>
        </div>
      </div>
    )
  }

  // Separate featured games from regular games
  const featuredGames = games.filter(game => FEATURED_GAMES.includes(game.game_id))
  const regularGames = games.filter(game => !FEATURED_GAMES.includes(game.game_id))

  // Sort featured games by the order defined in FEATURED_GAMES
  const sortedFeaturedGames = featuredGames.sort((a, b) => {
    return FEATURED_GAMES.indexOf(a.game_id) - FEATURED_GAMES.indexOf(b.game_id)
  })

  const getGameStyle = (gameId: string) => {
    return GAME_STYLES[gameId] || GAME_STYLES.default
  }

  return (
    <div>
      {/* Featured Games Banner */}
      {sortedFeaturedGames.length > 0 && (
        <section className="bg-[#6495ed] py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sortedFeaturedGames.map((game) => {
                const style = getGameStyle(game.game_id)
                return (
                  <div key={game.game_id} className="bg-white rounded-lg p-6 text-center">
                    <div className="text-6xl mb-4">{style.emoji}</div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">{game.display_name}</h3>
                    <p className="text-sm text-neutral-500 mb-2">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="text-center mt-6">
              <a href="#more-games" className="text-white text-sm hover:underline">
                READ ABOUT TODAY'S PUZZLE ON WORDPLAY
              </a>
            </div>
          </div>
        </section>
      )}

      {/* More Games Section */}
      <section className="py-12" id="more-games">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">More Games</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Show all featured games as cards */}
            {sortedFeaturedGames.map((game) => (
              <GameCard
                key={game.game_id}
                id={game.game_id}
                name={game.display_name}
                description={game.description}
                hasPlayedToday={game.hasPlayedToday}
                isAuthenticated={isAuthenticated}
                style={getGameStyle(game.game_id)}
              />
            ))}
            
            {/* Show regular games */}
            {regularGames.map((game) => (
              <GameCard
                key={game.game_id}
                id={game.game_id}
                name={game.display_name}
                description={game.description}
                hasPlayedToday={game.hasPlayedToday}
                isAuthenticated={isAuthenticated}
                style={getGameStyle(game.game_id)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}