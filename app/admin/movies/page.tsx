"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Clock,
  Film,
  Sparkles,
  TrendingUp,
  History,
  PenTool,
  Filter,
  Star,
  DollarSign,
  Users
} from "lucide-react"
import { format, addMonths, isAfter, formatDistanceToNow } from "date-fns"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  vote_average: number
  overview: string
}

interface MovieUsage {
  puzzleId: string
  puzzleDate: string
  gameType: string
  filmTitle: string
}

interface MovieUsageData {
  movieId: number
  totalUsage: number
  last30Days: {
    retitled: number
    budgetBracket: number
    castClimb: number
  }
  usage: MovieUsage[]
}

type FilterStatus = "all" | "available" | "recently-used" | "coming-soon" | "not-released"

export default function AdminMovieSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [recentUsage, setRecentUsage] = useState<Map<number, MovieUsage[]>>(new Map())
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [movieUsageData, setMovieUsageData] = useState<MovieUsageData | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [hoveredMovieId, setHoveredMovieId] = useState<number | null>(null)
  
  const supabase = getSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    fetchRecentMovieUsage()
  }, [])

  // Fetch usage data when hovering over a movie
  useEffect(() => {
    if (hoveredMovieId) {
      fetchMovieUsage(hoveredMovieId)
    }
  }, [hoveredMovieId])

  const fetchRecentMovieUsage = async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const usageMap = new Map<number, MovieUsage[]>()

    // Check retitled puzzles
    const { data: retitledData } = await supabase
      .from('retitled_puzzles')
      .select('id, puzzle_date, film_id, film_title')
      .gte('puzzle_date', thirtyDaysAgo.toISOString().split('T')[0])

    if (retitledData) {
      retitledData.forEach(puzzle => {
        const usage: MovieUsage = {
          puzzleId: puzzle.id,
          puzzleDate: puzzle.puzzle_date,
          gameType: 'retitled',
          filmTitle: puzzle.film_title
        }
        const existing = usageMap.get(puzzle.film_id) || []
        usageMap.set(puzzle.film_id, [...existing, usage])
      })
    }

    // Check cast climb puzzles
    const { data: castClimbData } = await supabase
      .from('cast_climb_puzzles')
      .select('id, puzzle_date, film_id, film_title')
      .gte('puzzle_date', thirtyDaysAgo.toISOString().split('T')[0])

    if (castClimbData) {
      castClimbData.forEach(puzzle => {
        const usage: MovieUsage = {
          puzzleId: puzzle.id,
          puzzleDate: puzzle.puzzle_date,
          gameType: 'cast_climb',
          filmTitle: puzzle.film_title
        }
        const existing = usageMap.get(puzzle.film_id) || []
        usageMap.set(puzzle.film_id, [...existing, usage])
      })
    }

    setRecentUsage(usageMap)
  }

  const fetchMovieUsage = async (movieId: number) => {
    setLoadingUsage(true)
    try {
      const response = await fetch(`/api/admin/movies/usage?movieId=${movieId}`)
      if (response.ok) {
        const data = await response.json()
        setMovieUsageData(data)
      }
    } catch (error) {
      console.error("Error fetching movie usage:", error)
    } finally {
      setLoadingUsage(false)
    }
  }

  const searchMovies = useCallback(async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(searchQuery)}`)
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
        return { 
          status: "not-released" as const, 
          label: "Not Released", 
          color: "text-gray-500",
          icon: Clock,
          bgColor: "bg-gray-100"
        }
      } else {
        return { 
          status: "coming-soon" as const, 
          label: "Coming Soon", 
          color: "text-yellow-600",
          icon: Sparkles,
          bgColor: "bg-yellow-100"
        }
      }
    }

    // Check if movie was used in last 30 days
    const movieUsage = recentUsage.get(movie.id)
    if (movieUsage && movieUsage.length > 0) {
      const games = [...new Set(movieUsage.map(u => u.gameType))]
      return { 
        status: "recently-used" as const, 
        label: `Recently used (${movieUsage.length}x)`, 
        color: "text-cinema-red",
        icon: History,
        bgColor: "bg-red-100"
      }
    }

    return { 
      status: "available" as const, 
      label: "Available", 
      color: "text-green-600",
      icon: CheckCircle,
      bgColor: "bg-green-100"
    }
  }

  const filteredResults = searchResults.filter(movie => {
    if (filterStatus === "all") return true
    const status = getMovieStatus(movie).status
    return status === filterStatus
  })

  const filterButtons = [
    { value: "all" as FilterStatus, label: "All Movies", icon: Film },
    { value: "available" as FilterStatus, label: "Available", icon: CheckCircle },
    { value: "recently-used" as FilterStatus, label: "Recently Used", icon: History },
    { value: "coming-soon" as FilterStatus, label: "Coming Soon", icon: Sparkles },
    { value: "not-released" as FilterStatus, label: "Not Released", icon: Clock }
  ]

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Movie Search</h1>
      
      {/* Search Bar with Animation */}
      <div className="mb-8">
        <div className="relative max-w-2xl group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMovies()}
            placeholder="Search for movies..."
            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cinema-red focus:border-cinema-red transition-all duration-200 group-hover:border border-[rgb(var(--silver))]"
          />
          <button
            onClick={searchMovies}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-cinema-red disabled:opacity-50 transition-all duration-200 hover:scale-110"
          >
            <Search className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      {searchResults.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {filterButtons.map((filter) => {
            const Icon = filter.icon
            return (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200 transform hover:scale-105
                  ${filterStatus === filter.value 
                    ? 'bg-cinema-red text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
                {filter.value !== "all" && (
                  <span className="ml-1 text-xs opacity-75">
                    ({searchResults.filter(m => {
                      const status = getMovieStatus(m).status
                      return status === filter.value
                    }).length})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}


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
          {filteredResults.map((movie) => {
            const { status, label, color, icon: StatusIcon, bgColor } = getMovieStatus(movie)
            const isUnavailable = status === "not-released" || status === "recently-used"
            const movieUsage = recentUsage.get(movie.id)
            
            return (
              <div
                key={movie.id}
                onMouseEnter={() => setHoveredMovieId(movie.id)}
                onMouseLeave={() => setHoveredMovieId(null)}
                onClick={() => handleMovieSelect(movie)}
                className={`cursor-pointer group relative transform transition-all duration-300 hover:-translate-y-1 ${
                  isUnavailable ? "opacity-75" : ""
                }`}
              >
                <div className="relative overflow-hidden rounded-xl shadow-md transition-all duration-300 group-hover:shadow-xl">
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                      <Film className="w-12 h-12 text-gray-400 animate-pulse" />
                    </div>
                  )}
                  
                  {/* Status Overlay with Animation */}
                  <div className={`absolute inset-0 transition-opacity duration-300 ${
                    status === "not-released" ? "bg-gray-900/30" :
                    status === "coming-soon" ? "bg-yellow-900/20" :
                    status === "recently-used" ? "bg-red-900/20" :
                    "bg-transparent group-hover:bg-black/10"
                  }`}></div>

                  {/* Hover Usage Info */}
                  {hoveredMovieId === movie.id && movieUsage && movieUsage.length > 0 && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="text-white text-xs space-y-1">
                        {movieUsage.slice(0, 3).map((usage, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="capitalize">{usage.gameType.replace('_', ' ')}</span>
                            <span className="text-white/60">•</span>
                            <span className="text-white/80">
                              {formatDistanceToNow(new Date(usage.puzzleDate), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                        {movieUsage.length > 3 && (
                          <div className="text-white/60">+{movieUsage.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Use in Puzzle Button */}
                  {status === "available" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/puzzle-editor?movieId=${movie.id}`)
                      }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-cinema-red p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 hover:bg-white hover:shadow-lg"
                      title="Use in puzzle"
                    >
                      <PenTool className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="mt-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-cinema-red transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {movie.release_date ? format(new Date(movie.release_date), "MMM d, yyyy") : "N/A"}
                    </p>
                    {movie.vote_average > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-600">{movie.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{label}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : searchQuery && !loading ? (
        <div className="text-center py-12">
          <Film className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">No movies found for "{searchQuery}"</p>
          <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="relative inline-block">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-gray-500">Search for movies to see results</p>
          <p className="text-sm text-gray-400 mt-2">Discover the perfect film for your next puzzle</p>
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
                    className="w-48 rounded-xl shadow-lg transform transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-48 aspect-[2/3] bg-gray-200 rounded-xl flex items-center justify-center">
                    <Film className="w-16 h-16 text-gray-400 animate-pulse" />
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
                      const { status, label, color, icon: StatusIcon } = getMovieStatus(selectedMovie)
                      return (
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${color.replace('text-', 'text-')}`} />
                          <span className={color}>{label}</span>
                        </div>
                      )
                    })()}

                    {selectedMovie.vote_average > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>Rating: {selectedMovie.vote_average.toFixed(1)}/10</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Overview</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedMovie.overview || "No overview available."}</p>
                  </div>

                  {/* Usage History */}
                  {movieUsageData && movieUsageData.totalUsage > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-600" />
                        Usage History (Last 30 Days)
                      </h4>
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center p-2 bg-white rounded-lg">
                            <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                            <div className="text-xs text-gray-600">Cast Climb</div>
                            <div className="font-semibold">{movieUsageData.last30Days.castClimb}</div>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg">
                            <Film className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                            <div className="text-xs text-gray-600">Retitled</div>
                            <div className="font-semibold">{movieUsageData.last30Days.retitled}</div>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <div className="text-xs text-gray-600">Budget</div>
                            <div className="font-semibold">{movieUsageData.last30Days.budgetBracket}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1 max-h-32 overflow-y-auto">
                          {movieUsageData.usage.slice(0, 5).map((usage, idx) => (
                            <div key={idx} className="flex items-center gap-2 py-1">
                              <span className="capitalize font-medium">{usage.gameType.replace('_', ' ')}</span>
                              <span className="text-gray-400">•</span>
                              <span>{format(new Date(usage.puzzleDate), "MMM d, yyyy")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div>
                  {getMovieStatus(selectedMovie).status === "available" && (
                    <button
                      onClick={() => {
                        router.push(`/admin/puzzle-editor?movieId=${selectedMovie.id}`)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-cinema-red text-white rounded-lg hover:bg-red-700 transition-all duration-200 transform hover:scale-105"
                    >
                      <PenTool className="w-4 h-4" />
                      Use in Puzzle
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedMovie(null)
                    setMovieUsageData(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200"
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