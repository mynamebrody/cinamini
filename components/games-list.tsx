"use client"

import { useState, useEffect } from "react"
import GameCard from "./game-card"
import { Loader2 } from "lucide-react"
import { GameLogo } from "./game-logo"
import { PuzzleCountdown } from "./puzzle-countdown"

interface Game {
  game_id: string
  display_name: string
  description: string
  hasPlayedToday: boolean
}

interface GamesListProps {
  isAuthenticated: boolean
}

// Define which games should be featured (2x2 grid on mobile, 4 across on desktop)
const FEATURED_GAMES = ['retitled', 'budget-bracket', 'cast-climb', 'poster-pixels']

// Game logo and color mappings - New Sophisticated Cinema Palette
const GAME_STYLES: Record<string, { emoji?: string; logo?: string; logoPng?: string; bgColor: string; textColor?: string }> = {
  'cast-climb': { logo: '/cinamini/games/CastClimbPoster.svg', logoPng: '/cinamini/games/CastClimbPoster.png', bgColor: '#99251d', textColor: 'white' }, // Deep Cinema Red - Theater theme
  'retitled': { logo: '/cinamini/games/RetitledPoster.svg', logoPng: '/cinamini/games/RetitledPoster.png', bgColor: '#ebbb4a', textColor: 'white' }, // Warm Golden - World adventure
  'budget-bracket': { logo: '/cinamini/games/BudgetBracketPoster.svg', logoPng: '/cinamini/games/BudgetBracketPoster.png', bgColor: '#278646', textColor: 'white' }, // Cinema Green - Money/success theme
  'poster-pixels': { logo: '/cinamini/games/PosterPixelsPoster.svg', logoPng: '/cinamini/games/PosterPixelsPoster.png', bgColor: '#3a3a3c', textColor: 'white' }, // Charcoal - Art gallery sophistication
  // Default for any new games
  'default': { emoji: '🎬', bgColor: '#d1d2d4', textColor: '#3a3a3c' } // Silver with charcoal text
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
      
      // All users now get their status from the API
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
          <p className="text-neutral-600">Loading today&apos;s puzzles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-700 font-medium mb-2">Unable to load games</p>
          <p className="text-cinema-red text-sm">{error}</p>
          <button 
            onClick={loadGames}
            className="mt-4 px-4 py-2 bg-cinema-red text-white rounded hover:bg-red-700 transition-colors"
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
    <div className="bg-white">
      {/* Hero Section - Featured Games */}
      {sortedFeaturedGames.length > 0 && (
        <section className="bg-white py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Date and Title */}
            <div className="text-center mb-12 md:mb-16">
              <p className="text-xs md:text-sm text-neutral-500 mb-2 md:mb-3 font-funnel uppercase tracking-wider font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC'
                })}
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 font-funnel-display-bold tracking-tight px-4 md:px-0 mt-4">
                Today&apos;s Cinema Games
              </h1>
              <p className="text-base md:text-lg text-neutral-600 mt-3 md:mt-4 font-funnel max-w-2xl mx-auto px-4 md:px-0">
                Four movie puzzles, updated daily. Can you solve them all?
              </p>
            </div>

            {/* Featured Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
              {sortedFeaturedGames.map((game) => {
                const style = getGameStyle(game.game_id)
                
                return (
                  <div
                    key={game.game_id}
                    className="group cursor-pointer transition-all duration-300 hover:scale-[1.03] border border-[#d1d2d4]"
                    style={{
                      boxShadow: 'none',
                      borderRadius: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#999'
                      e.currentTarget.style.boxShadow = `1px 1px 0px #999,
                                                        2px 2px 0px #999,
                                                        3px 3px 0px #999,
                                                        4px 4px 0px #999,
                                                        5px 5px 0px #999,
                                                        6px 6px 0px #999`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d2d4'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    onClick={() => window.location.href = `/game/${game.game_id}`}
                  >
                    <div
                      className="p-6 md:p-8 text-center h-72 flex flex-col justify-center items-center relative overflow-hidden"
                      style={{ 
                        backgroundColor: style.bgColor,
                        borderRadius: 0,
                        imageRendering: 'pixelated',
                        shapeRendering: 'crispEdges'
                      }}
                    >
                      {/* Game Icon */}
                      <div className="mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                        <GameLogo
                          logo={style.logo}
                          logoPng={style.logoPng}
                          emoji={style.emoji}
                          alt={game.display_name}
                          width={80}
                          height={80}
                          className="w-16 h-16 md:w-20 md:h-20"
                        />
                      </div>
                      
                      {/* Game Title */}
                      <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 font-funnel-display-bold text-white drop-shadow-sm">
                        {game.display_name}
                      </h2>
                      
                      {/* Game Description */}
                      <p className="text-white/95 text-sm md:text-base font-funnel leading-relaxed max-w-xs md:max-w-sm drop-shadow-sm px-2 md:px-0">
                        {game.description}
                      </p>

                      {/* Play Status */}
                      {game.hasPlayedToday && (
                        <div className="absolute top-5 right-5">
                          <div className="bg-white/30 backdrop-blur-sm px-3 py-1.5 border border-[#d1d2d4] shadow-[1px_1px_0px_rgba(209,210,212,0.5),2px_2px_0px_rgba(209,210,212,0.5),3px_3px_0px_rgba(209,210,212,0.5),4px_4px_0px_rgba(209,210,212,0.5)]" style={{ borderRadius: 0 }}>
                            <span className="text-xs font-semibold text-white font-funnel">
                              ✓ Completed
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
          </div>
          {/* Puzzle Rotation Info - Moved below games with proper spacing */}
          <div className="flex flex-col items-center justify-center mt-16 space-y-2">
            <p className="text-xs text-neutral-400 font-funnel text-center">
              Puzzles rotate at midnight UTC
            </p>
            <PuzzleCountdown />
          </div>
        </section>
      )}

      {/* More Games Section */}
      {regularGames.length > 0 && (
        <section className="bg-neutral-50/50 py-20" id="more-games">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 font-funnel-display-bold mb-4 tracking-tight">
                More Games
              </h2>
              <p className="text-lg text-neutral-600 font-funnel max-w-xl mx-auto">
                Additional puzzles and challenges coming soon
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
      )}
    </div>
  )
}