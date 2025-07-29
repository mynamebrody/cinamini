"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Search, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Clock,
  Film
} from "lucide-react"
import { format, addMonths, isAfter } from "date-fns"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  vote_average: number
  overview: string
}

interface MovieUsage {
  movie_id: number
  game_id: string
  used_date: string
}

export default function AdminMovieSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [recentUsage, setRecentUsage] = useState<MovieUsage[]>([])
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchRecentMovieUsage()
  }, [])

  const fetchRecentMovieUsage = async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Check all puzzle tables for recent movie usage
    const tables = [
      { table: 'budget_bracket_puzzles', movieFields: ['movieA_tmdb_id', 'movieB_tmdb_id'] },
      { table: 'retitled_puzzles', movieFields: ['movie_id'] },
      { table: 'cast_climb_puzzles', movieFields: ['movie_id'] }
    ]

    const allUsage: MovieUsage[] = []

    for (const { table, movieFields } of tables) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (data) {
        data.forEach(puzzle => {
          movieFields.forEach(field => {
            if (puzzle[field]) {
              allUsage.push({
                movie_id: puzzle[field],
                game_id: table.replace('_puzzles', ''),
                used_date: puzzle.created_at
              })
            }
          })
        })
      }
    }

    setRecentUsage(allUsage)
  }

  const searchMovies = useCallback(async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/movies/search?query=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error("Error searching movies:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const getMovieStatus = (movie: Movie) => {
    const releaseDate = new Date(movie.release_date)
    const today = new Date()
    const oneMonthFromNow = addMonths(today, 1)

    // Check if movie is not yet released
    if (isAfter(releaseDate, today)) {
      if (isAfter(releaseDate, oneMonthFromNow)) {
        return { status: "upcoming", label: "Not Released", color: "text-gray-500" }
      } else {
        return { status: "coming-soon", label: "Coming Soon", color: "text-yellow-600" }
      }
    }

    // Check if movie was used in last 30 days
    const usedRecently = recentUsage.filter(u => u.movie_id === movie.id)
    if (usedRecently.length > 0) {
      const games = [...new Set(usedRecently.map(u => u.game_id))]
      return { 
        status: "used", 
        label: `Used in: ${games.join(", ")}`, 
        color: "text-red-600" 
      }
    }

    return { status: "available", label: "Available", color: "text-green-600" }
  }

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Movie Search</h1>
      
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMovies()}
            placeholder="Search for movies..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={searchMovies}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span>Not Released</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 rounded"></div>
          <span>Coming Soon (Next Month)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 rounded"></div>
          <span>Recently Used (Last 30 Days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <span>Available</span>
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-[2/3] mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-1"></div>
              <div className="bg-gray-200 h-3 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {searchResults.map((movie) => {
            const { status, label, color } = getMovieStatus(movie)
            const isUnavailable = status === "upcoming" || status === "used"
            
            return (
              <div
                key={movie.id}
                onClick={() => handleMovieSelect(movie)}
                className={`cursor-pointer group relative ${
                  isUnavailable ? "opacity-60" : ""
                }`}
              >
                <div className="relative overflow-hidden rounded-lg shadow-md transition-transform group-hover:scale-105">
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                      <Film className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Status Overlay */}
                  <div className={`absolute inset-0 ${
                    status === "upcoming" ? "bg-gray-900/30" :
                    status === "coming-soon" ? "bg-yellow-900/20" :
                    status === "used" ? "bg-red-900/20" :
                    ""
                  }`}></div>
                </div>
                
                <div className="mt-2">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${color}`}>
                    {label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : searchQuery && !loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No movies found for "{searchQuery}"</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Search for movies to see results</p>
        </div>
      )}

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMovie(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex gap-6 mb-6">
                {selectedMovie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${selectedMovie.poster_path}`}
                    alt={selectedMovie.title}
                    className="w-48 rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-48 aspect-[2/3] bg-gray-200 rounded-lg flex items-center justify-center">
                    <Film className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{selectedMovie.title}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        Release: {selectedMovie.release_date 
                          ? format(new Date(selectedMovie.release_date), "MMMM d, yyyy")
                          : "Unknown"}
                      </span>
                    </div>
                    
                    {(() => {
                      const { status, label, color } = getMovieStatus(selectedMovie)
                      return (
                        <div className="flex items-center gap-2">
                          {status === "available" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : status === "used" ? (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className={color}>{label}</span>
                        </div>
                      )
                    })()}
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Overview</h4>
                    <p className="text-sm text-gray-600">{selectedMovie.overview || "No overview available."}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedMovie(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}