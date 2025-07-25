"use client"

import { useState, useEffect } from "react"
import GameCard from "./game-card"
import { Loader2, Archive } from "lucide-react"

interface Game {
  game_id: string
  display_name: string
  description: string
  hasPlayedToday: boolean
}

export default function AllGames() {
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
      <section className="py-12 border-t border-white/10">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-12 border-t border-white/10">
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      </section>
    )
  }

  // Show additional games if more than 3 exist, or if we want to show an archive section
  const additionalGames = games.slice(3)
  
  // If no additional games or less than 4 total games, don't show this section
  if (games.length <= 3) {
    return null
  }

  return (
    <section className="py-12 border-t border-white/10">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-gray-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">More Games</h2>
            <p className="text-gray-400">Explore our full collection of cinema puzzles</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {additionalGames.map((game) => (
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
    </section>
  )
}