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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No games available yet.</p>
      </div>
    )
  }

  // Separate featured games from other games
  const featuredGames = games.filter(game => 
    game.game_id === 'budget-bracket' || game.game_id === 'retitled' || game.game_id === 'cast-climb'
  )
  const otherGames = games.filter(game => 
    !featuredGames.some(featured => featured.game_id === game.game_id)
  )

  return (
    <div className="space-y-12">
      {/* Featured Games Section */}
      {featuredGames.length > 0 && (
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Featured Games</h2>
            <p className="text-gray-400 text-lg">Our most popular daily movie challenges</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {featuredGames.map((game) => (
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
      
      {/* Other Games Section */}
      {otherGames.length > 0 && (
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">More Games</h2>
            <p className="text-gray-400">Additional challenges coming soon</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherGames.map((game) => (
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

      {/* Show all games in a simple grid if no games to separate */}
      {featuredGames.length === 0 && (
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Today's Puzzles</h2>
            <p className="text-gray-400">Test your movie knowledge with our daily challenges</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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