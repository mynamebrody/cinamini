"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CheckCircle2, PlayCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Game {
  game_id: string
  display_name: string
  description: string
  hasPlayedToday: boolean
}

export default function FeaturedGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

  const handlePlay = (gameId: string) => {
    router.push(`/game/${gameId}`)
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric' 
  })

  if (loading) {
    return (
      <section className="py-12">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-12">
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      </section>
    )
  }

  if (games.length === 0) {
    return (
      <section className="py-12">
        <div className="text-center py-12">
          <p className="text-gray-400">No games available yet.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Today's Featured Games</h2>
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{today}</span>
        </div>
      </div>

      {/* Featured Games Grid - First 2 games get large treatment */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {games.slice(0, 2).map((game) => (
                     <Card
             key={game.game_id}
             className={cn(
               "bg-[#1c1c1c] border-white/10 hover:border-white/20 transition-all overflow-hidden relative",
               "hover:shadow-xl hover:scale-[1.02] cursor-pointer group"
             )}
           >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {game.hasPlayedToday && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-sm font-medium text-blue-400 uppercase tracking-wide">
                      {game.hasPlayedToday ? "Completed" : "Daily Challenge"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                    {game.display_name}
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                    {game.description}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={() => handlePlay(game.game_id)}
                size="lg"
                className={cn(
                  "w-full",
                  game.hasPlayedToday 
                    ? "bg-white/10 text-white hover:bg-white/20" 
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                )}
              >
                {game.hasPlayedToday ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    View Your Result
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Play Now
                  </>
                )}
              </Button>
            </div>
            
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
          </Card>
        ))}
      </div>

      {/* Third game gets smaller but still prominent treatment if it exists */}
      {games.length > 2 && (
        <div className="max-w-2xl mx-auto">
          {games.slice(2, 3).map((game) => (
            <Card
              key={game.game_id}
              className={cn(
                "bg-[#1c1c1c] border-white/10 hover:border-white/20 transition-all",
                "hover:shadow-lg hover:scale-[1.02] cursor-pointer group"
              )}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {game.hasPlayedToday && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                        {game.hasPlayedToday ? "Completed" : "Daily Challenge"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors mb-2">
                      {game.display_name}
                    </h3>
                    <p className="text-gray-400">{game.description}</p>
                  </div>
                  
                  <Button
                    onClick={() => handlePlay(game.game_id)}
                    className={cn(
                      "ml-6",
                      game.hasPlayedToday 
                        ? "bg-white/10 text-white hover:bg-white/20" 
                        : "bg-white text-black hover:bg-gray-200"
                    )}
                  >
                    {game.hasPlayedToday ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        View Result
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Play Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}