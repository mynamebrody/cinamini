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

export default function GamesList() {
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

  return (
    <div className="space-y-6">
      <div>
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
          />
        ))}
      </div>
    </div>
  )
}