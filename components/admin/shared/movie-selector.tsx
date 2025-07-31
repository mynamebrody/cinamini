"use client"

import { useState, useEffect } from "react"
import { Search, Film, Calendar, AlertCircle, Check, X, Loader2, Shuffle } from "lucide-react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import MovieDetailsCard from "./movie-details-card"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  overview?: string
  budget?: number
  revenue?: number
  vote_average?: number
  runtime?: number
  director?: string
  writer?: string
  tagline?: string | null
  status?: string | null
  genres?: Array<{ id: number; name: string }>
  production_companies?: Array<{
    id: number
    name: string
    logo_path: string | null
    origin_country: string
  }>
  main_cast?: Array<{
    name: string
    character: string
    order: number
  }>
}

interface MovieUsage {
  movieId: number
  totalUsage: number
  last30Days: {
    retitled: number
    budgetBracket: number
    castClimb: number
  }
  usage: Array<{
    puzzleId: string
    puzzleDate: string
    gameType: string
    filmTitle: string
  }>
}

interface MovieSelectorProps {
  onSelect: (movie: Movie) => void
  onClose?: () => void
  selectedMovieId?: number | null
  showBudget?: boolean
  excludeIds?: number[]
}

export default function MovieSelector({ 
  onSelect, 
  onClose, 
  selectedMovieId,
  showBudget = false,
  excludeIds = []
}: MovieSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [movieUsage, setMovieUsage] = useState<MovieUsage | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)

  const fetchMovieUsage = async (movieId: number) => {
    setLoadingUsage(true)
    try {
      const response = await fetch(`/api/admin/movies/usage?movieId=${movieId}`)
      if (response.ok) {
        const data = await response.json()
        setMovieUsage(data)
      }
    } catch (error) {
      console.error("Error fetching movie usage:", error)
    } finally {
      setLoadingUsage(false)
    }
  }

  const searchMovies = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        
        // Always fetch additional details for better UX
        const moviesWithDetails = await Promise.all(
          data.results.slice(0, 10).map(async (movie: any) => {
            try {
              const detailsResponse = await fetch(`/api/movies/${movie.id}/details`)
              if (detailsResponse.ok) {
                const details = await detailsResponse.json()
                return {
                  id: movie.id,
                  title: movie.title,
                  poster_path: movie.poster_path || details.poster_path,
                  release_date: movie.release_date || details.release_date,
                  overview: movie.overview || details.overview,
                  budget: details.budget,
                  revenue: details.revenue,
                  vote_average: movie.vote_average || details.vote_average,
                  runtime: details.runtime,
                  director: details.director,
                  writer: details.writer,
                  tagline: details.tagline,
                  status: details.status,
                  genres: details.genres,
                  production_companies: details.production_companies,
                  main_cast: details.main_cast
                }
              }
            } catch (error) {
              console.error(`Error fetching details for movie ${movie.id}:`, error)
            }
            return {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
              release_date: movie.releaseYear ? `${movie.releaseYear}-01-01` : movie.release_date,
              overview: movie.overview,
              vote_average: movie.rating
            }
          })
        )
        setSearchResults(moviesWithDetails.filter(m => !excludeIds.includes(m.id)))
      }
    } catch (error) {
      console.error("Error searching movies:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadRandomMovies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/movies/trending?time_window=week')
      if (response.ok) {
        const data = await response.json()
        const trendingMovies = (data.results || [])
          .filter((m: any) => !excludeIds.includes(m.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 10)
        
        // Fetch additional details for trending movies
        const moviesWithDetails = await Promise.all(
          trendingMovies.map(async (movie: any) => {
            try {
              const detailsResponse = await fetch(`/api/movies/${movie.id}/details`)
              if (detailsResponse.ok) {
                const details = await detailsResponse.json()
                return {
                  id: movie.id,
                  title: movie.title,
                  poster_path: movie.poster_path || details.poster_path,
                  release_date: movie.release_date || details.release_date,
                  overview: movie.overview || details.overview,
                  budget: details.budget,
                  revenue: details.revenue,
                  vote_average: movie.vote_average || details.vote_average,
                  runtime: details.runtime,
                  director: details.director,
                  writer: details.writer,
                  tagline: details.tagline,
                  status: details.status,
                  genres: details.genres,
                  production_companies: details.production_companies,
                  main_cast: details.main_cast
                }
              }
            } catch (error) {
              console.error(`Error fetching details for movie ${movie.id}:`, error)
            }
            return {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
              release_date: movie.release_date,
              overview: movie.overview,
              vote_average: movie.vote_average
            }
          })
        )
        
        setSearchResults(moviesWithDetails)
        setSearchQuery("")
      }
    } catch (error) {
      console.error("Error loading random movies:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-load trending movies on mount
    if (searchResults.length === 0 && searchQuery === "") {
      loadRandomMovies()
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMovies(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie)
    fetchMovieUsage(movie.id)
  }

  const confirmSelection = () => {
    if (selectedMovie) {
      onSelect(selectedMovie)
      setSearchQuery("")
      setSearchResults([])
      setSelectedMovie(null)
      setMovieUsage(null)
    }
  }

  const getMovieStatus = (movie: Movie) => {
    if (!movie.release_date) {
      return { status: "unknown", label: "Unknown Release", color: "bg-gray-100 text-gray-800" }
    }
    
    const releaseDate = new Date(movie.release_date)
    if (isNaN(releaseDate.getTime())) {
      return { status: "unknown", label: "Unknown Release", color: "bg-gray-100 text-gray-800" }
    }
    
    const today = new Date()
    const daysUntilRelease = Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (releaseDate > today) {
      if (daysUntilRelease <= 30) {
        return { status: "coming-soon", label: "Coming Soon", color: "bg-yellow-100 text-yellow-800" }
      }
      return { status: "unreleased", label: "Not Released", color: "bg-gray-100 text-gray-800" }
    }

    return { status: "available", label: "Available", color: "bg-green-100 text-green-800" }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input - Fixed at top */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a movie..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      </div>

      {/* Main content area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-24 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-3">
            {searchResults.map((movie) => {
              const isSelected = selectedMovie?.id === movie.id

              return (
                <div
                  key={movie.id}
                  onClick={() => handleSelectMovie(movie)}
                  className={cn(
                    "cursor-pointer transition-all rounded-lg",
                    isSelected && "ring-2 ring-blue-500"
                  )}
                >
                  <MovieDetailsCard
                    movie={movie}
                    compact={true}
                  />
                </div>
              )
            })}
          </div>
        ) : searchQuery.trim() ? (
          <div className="text-center py-8 text-gray-500">
            <Film className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No movies found</p>
          </div>
        ) : null}
      </div>

      {/* Selected Movie Usage & Selection - Fixed at bottom */}
      {selectedMovie && (
        <div className="border-t pt-4 mt-4 bg-white">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Movie Availability</h4>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMovie(null)
                      setMovieUsage(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmSelection}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Select Movie
                  </Button>
                </div>
              </div>

              {/* Usage Information - Compact */}
              {loadingUsage ? (
                <div className="flex items-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Checking usage...</span>
                </div>
              ) : movieUsage && movieUsage.totalUsage > 0 ? (
                <div className="text-sm">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Used {movieUsage.totalUsage} times in last 30 days</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {movieUsage.last30Days.retitled > 0 && (
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                        Retitled: {movieUsage.last30Days.retitled}
                      </Badge>
                    )}
                    {movieUsage.last30Days.budgetBracket > 0 && (
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                        Budget: {movieUsage.last30Days.budgetBracket}
                      </Badge>
                    )}
                    {movieUsage.last30Days.castClimb > 0 && (
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                        Cast: {movieUsage.last30Days.castClimb}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>Available - Not used in the last 30 days</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}