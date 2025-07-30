"use client"

import { useState, useEffect } from "react"
import GameCard from "./game-card"
import { Loader2 } from "lucide-react"

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
      setGames(data.games || [])
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

  return (
    <div className="space-y-16">
      {/* Featured Games Section */}
      {sortedFeaturedGames.length > 0 && (
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="font-nyt text-3xl font-bold text-neutral-900 mb-3">
              Today's Featured Puzzles
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Challenge yourself with our most popular movie games. Each puzzle refreshes daily at midnight.
            </p>
          </div>
          
          {/* Featured games grid - responsive layout for 1-3 games */}
          <div className={`grid gap-8 ${
            sortedFeaturedGames.length === 1 
              ? 'max-w-2xl mx-auto' 
              : sortedFeaturedGames.length === 2 
                ? 'md:grid-cols-2 max-w-4xl mx-auto' 
                : 'md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {sortedFeaturedGames.map((game) => (
              <GameCard
                key={game.game_id}
                id={game.game_id}
                name={game.display_name}
                description={game.description}
                hasPlayedToday={game.hasPlayedToday}
                featured={true}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* All Other Games Section */}
      {regularGames.length > 0 && (
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="font-nyt text-2xl font-bold text-neutral-900 mb-3">
              More Games
            </h2>
            <p className="text-neutral-600">
              Additional movie challenges and experiments
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {regularGames.map((game) => (
              <GameCard
                key={game.game_id}
                id={game.game_id}
                name={game.display_name}
                description={game.description}
                hasPlayedToday={game.hasPlayedToday}
                featured={false}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </section>
      )}

      {/* Show all games in featured layout if no separation needed */}
      {sortedFeaturedGames.length === 0 && regularGames.length > 0 && (
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="font-nyt text-3xl font-bold text-neutral-900 mb-3">
              Today's Movie Puzzles
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Test your cinema knowledge with our collection of daily challenges
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <GameCard
                key={game.game_id}
                id={game.game_id}
                name={game.display_name}
                description={game.description}
                hasPlayedToday={game.hasPlayedToday}
                featured={false}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}