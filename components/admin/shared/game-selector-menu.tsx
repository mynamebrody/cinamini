"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Film, Gamepad2, DollarSign, ImageIcon, X } from "lucide-react"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
}

interface GameSelectorMenuProps {
  movie: Movie
  date?: Date
  onClose: () => void
  excludeGames?: string[]
}

const AVAILABLE_GAMES = [
  { 
    id: 'retitled', 
    name: 'Retitled', 
    icon: Film,
    description: 'Players guess movies from foreign titles'
  },
  { 
    id: 'cast-climb', 
    name: 'Cast Climb', 
    icon: Gamepad2,
    description: 'Players guess movies from cast member reveals'
  },
  { 
    id: 'budget-bracket', 
    name: 'Budget Bracket', 
    icon: DollarSign,
    description: 'Players compare movie budgets in elimination rounds'
  },
  { 
    id: 'poster-pixels', 
    name: 'Poster Pixels', 
    icon: ImageIcon,
    description: 'Players guess movies from pixelated poster reveals'
  }
]

export default function GameSelectorMenu({ movie, date, onClose, excludeGames = [] }: GameSelectorMenuProps) {
  const router = useRouter()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  const availableGames = AVAILABLE_GAMES.filter(game => !excludeGames.includes(game.id))

  const handleGameSelect = (gameType: string) => {
    const params = new URLSearchParams()
    
    if (date) {
      params.set('date', format(date, 'yyyy-MM-dd'))
    }
    params.set('gameType', gameType)
    params.set('movieId', movie.id.toString())

    const url = `/admin/puzzle-editor?${params.toString()}`
    router.push(url)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="admin-modal-silver bg-white max-w-md w-full mx-4 animate-scale-in relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="admin-modal-ghost-close absolute top-4 right-4 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pr-12">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-xl font-funnel-display-bold text-neutral-900 mb-2">
              Create Puzzle {date && `for ${format(date, 'MMM d, yyyy')}`}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              {movie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                  alt={movie.title}
                  className="w-12 h-16 object-cover border border-neutral-200"
                  style={{ boxShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}
                />
              )}
              <div>
                <p className="font-funnel font-medium text-sm text-neutral-900">{movie.title}</p>
                {movie.release_date && (
                  <p className="text-xs text-neutral-600 font-funnel">
                    {new Date(movie.release_date).getFullYear()}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-neutral-600 font-funnel">
              Select a game type to create a puzzle with this movie:
            </p>
          </div>

          {/* Game Options */}
          <div className="space-y-2 mb-6">
            {availableGames.map((game) => {
              const Icon = game.icon
              return (
                <button
                  key={game.id}
                  onClick={() => handleGameSelect(game.id)}
                  className="w-full flex items-start gap-3 p-3 border-2 border-neutral-200 hover:border-cinema-red hover:bg-red-50 transition-colors text-left admin-btn-secondary"
                >
                  <Icon className="w-5 h-5 text-cinema-red flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-funnel font-medium block text-neutral-900">{game.name}</span>
                    <span className="text-xs text-neutral-600 font-funnel">{game.description}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {availableGames.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 font-funnel">
                No games available for this selection.
              </p>
            </div>
          )}

          {/* Cancel Button */}
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-colors font-funnel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}