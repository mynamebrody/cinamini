"use client"

import { useState, useEffect } from "react"
import { Search, Film, AlertCircle, Check, X, Loader2 } from "lucide-react"
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

type TabType = 'search' | 'now_playing' | 'popular' | 'top_rated' | 'upcoming'

interface CachedList {
  movies: Movie[]
  loaded: boolean
  loading: boolean
  error?: string
}

export default function MovieSelector({ 
  onSelect, 
  onClose, 
  selectedMovieId,
  showBudget = false,
  excludeIds = []
}: MovieSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('search')
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [movieUsage, setMovieUsage] = useState<MovieUsage | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [componentReady, setComponentReady] = useState(true)
  
  // State for cached movie lists
  const [cachedLists, setCachedLists] = useState<Record<Exclude<TabType, 'search'>, CachedList>>({
    now_playing: { movies: [], loaded: false, loading: false },
    popular: { movies: [], loaded: false, loading: false },
    top_rated: { movies: [], loaded: false, loading: false },
    upcoming: { movies: [], loaded: false, loading: false }
  })

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

  const hasValidBudget = (movie: any): boolean => {
    // For Budget Bracket games, enforce minimum $100 budget requirement
    if (showBudget) {
      return movie.budget && typeof movie.budget === 'number' && movie.budget >= 100
    }
    // For other games, just ensure budget exists and is > 0
    return movie.budget && typeof movie.budget === 'number' && movie.budget > 0
  }

  // Function to fetch cached movie lists
  const fetchMovieList = async (listType: Exclude<TabType, 'search'>) => {
    if (cachedLists[listType].loaded || cachedLists[listType].loading) {
      return
    }

    setCachedLists(prev => ({
      ...prev,
      [listType]: { ...prev[listType], loading: true }
    }))

    try {
      const endpoint = `/api/movies/${listType.replace('_', '-')}`
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${listType} movies`)
      }
      
      const data = await response.json()
      const movies = data.results || []
      
      // Filter movies based on budget requirements and exclude IDs
      let filteredMovies = movies.filter((m: any) => !excludeIds.includes(m.id))
      
      if (showBudget) {
        filteredMovies = filteredMovies.filter((m: any) => hasValidBudget(m))
      }

      setCachedLists(prev => ({
        ...prev,
        [listType]: {
          movies: filteredMovies,
          loaded: true,
          loading: false
        }
      }))
    } catch (error) {
      console.error(`Error fetching ${listType} movies:`, error)
      
      // Add user-friendly error feedback
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setCachedLists(prev => ({
        ...prev,
        [listType]: { 
          movies: [], 
          loaded: true, // Mark as loaded to prevent retry loops
          loading: false,
          error: errorMessage
        }
      }))
    }
  }

  // Handle tab changes
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab)
    
    // Clear search when switching away from search tab
    if (newTab !== 'search') {
      setSearchQuery("")
      setSearchResults([])
    }
    
    // Fetch list if it hasn't been loaded yet
    if (newTab !== 'search') {
      fetchMovieList(newTab)
    }
  }

  const searchMovies = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      console.log('Starting movie search for:', query)
      
      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.text()
        console.error('Search API error:', response.status, response.statusText, errorData)
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Search API response:', data)
      
      if (!data.results || !Array.isArray(data.results)) {
        console.error('Invalid search response format:', data)
        throw new Error('Invalid response format from search API')
      }
      
      // Limit concurrent detail fetches and add better error handling
      const detailPromises = data.results.slice(0, 8).map(async (movie: any, index: number) => {
        try {
          // Add delay between requests to avoid rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, index * 100))
          }
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout per detail request
          
          const detailsResponse = await fetch(`/api/movies/${movie.id}/details`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          })
          
          clearTimeout(timeoutId)
          
          if (detailsResponse.ok) {
            const details = await detailsResponse.json()
            return {
              id: movie.id,
              title: movie.title,
              poster_path: movie.posterUrl ? movie.posterUrl.replace('https://image.tmdb.org/t/p/w500', '') : details.poster_path,
              release_date: movie.releaseYear ? `${movie.releaseYear}-01-01` : details.release_date,
              overview: movie.overview || details.overview,
              budget: details.budget,
              revenue: details.revenue,
              vote_average: movie.rating || details.vote_average,
              runtime: details.runtime,
              director: movie.director || details.director,
              writer: details.writer,
              tagline: details.tagline,
              status: details.status,
              genres: details.genres,
              production_companies: details.production_companies,
              main_cast: details.main_cast
            }
          } else {
            console.warn(`Details API error for movie ${movie.id}:`, detailsResponse.status)
            // Return basic movie data if details fetch fails
            return {
              id: movie.id,
              title: movie.title,
              poster_path: movie.posterUrl ? movie.posterUrl.replace('https://image.tmdb.org/t/p/w500', '') : null,
              release_date: movie.releaseYear ? `${movie.releaseYear}-01-01` : '',
              overview: movie.overview || 'No overview available.',
              vote_average: movie.rating || 0,
              director: movie.director
            }
          }
        } catch (error) {
          console.warn(`Error fetching details for movie ${movie.id}:`, error)
          // Return basic movie data if there's an error
          return {
            id: movie.id,
            title: movie.title,
            poster_path: movie.posterUrl ? movie.posterUrl.replace('https://image.tmdb.org/t/p/w500', '') : null,
            release_date: movie.releaseYear ? `${movie.releaseYear}-01-01` : '',
            overview: movie.overview || 'No overview available.',
            vote_average: movie.rating || 0,
            director: movie.director
          }
        }
      })
      
      const moviesWithDetails = await Promise.all(detailPromises)
      console.log('Movies with details fetched:', moviesWithDetails.length)
      
      // Filter movies based on budget requirements and exclude IDs
      const excludedByIds = moviesWithDetails.filter(m => excludeIds.includes(m.id))
      const afterExcludeFilter = moviesWithDetails.filter(m => !excludeIds.includes(m.id))
      
      const filteredMovies = afterExcludeFilter.filter(m => {
        if (showBudget) {
          const isValid = hasValidBudget(m)
          if (!isValid) {
            console.log(`Filtered out "${m.title}" - Budget: $${(m.budget || 0).toLocaleString()} (minimum required: $100)`)
          }
          return isValid
        }
        return true
      })
      
      console.log(`Search results for "${query}":`, {
        totalFetched: moviesWithDetails.length,
        excludedByIds: excludedByIds.length,
        filteredByBudget: afterExcludeFilter.length - filteredMovies.length,
        finalResults: filteredMovies.length,
        showBudget
      })
        
      setSearchResults(filteredMovies)
      
    } catch (error) {
      console.error("Error searching movies:", error)
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request was aborted (timeout)')
        } else if (error.message.includes('Failed to fetch')) {
          console.error('Network error - check connection and API endpoints')
        }
      }
      
      // Set empty results on error to show no results state
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }


  // Search with debouncing - only when on search tab
  useEffect(() => {
    if (activeTab === 'search') {
      const timeoutId = setTimeout(() => {
        searchMovies(searchQuery)
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, activeTab])


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

  // Get current movie list to display
  const getCurrentMovies = (): Movie[] => {
    if (activeTab === 'search') {
      return searchResults
    } else {
      return cachedLists[activeTab].movies
    }
  }

  // Get current loading state
  const getCurrentLoading = (): boolean => {
    if (activeTab === 'search') {
      return loading
    } else {
      return cachedLists[activeTab].loading
    }
  }

  // Tab configuration
  const tabs = [
    { key: 'search' as TabType, label: 'Search', icon: Search },
    { key: 'now_playing' as TabType, label: 'Now Playing' },
    { key: 'popular' as TabType, label: 'Popular' },
    { key: 'top_rated' as TabType, label: 'Top Rated' },
    { key: 'upcoming' as TabType, label: 'Upcoming' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Search Input - Fixed at top */}
      {activeTab === 'search' && (
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a movie..."
              className="w-full pl-10 pr-4 py-2 border border border-[rgb(var(--silver))] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Tabs - Fixed below search */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 border",
                activeTab === tab.key
                  ? "bg-white text-cinema-red border-cinema-red shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29)]"
                  : "bg-white text-cinema-red border-neutral-200 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]"
              )}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Loading State */}
        {getCurrentLoading() ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={`movie-skeleton-${i}`} className="animate-pulse">
                <div className="bg-gray-200 h-24 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : getCurrentMovies().length > 0 ? (
          <div className="space-y-3">
            {getCurrentMovies().map((movie) => {
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
        ) : activeTab === 'search' && searchQuery.trim() ? (
          <div className="text-center py-8 text-gray-500">
            <Film className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No movies found</p>
            {showBudget && (
              <p className="text-sm mt-2">
                Only movies with budgets ≥$100 are shown for Budget Bracket
              </p>
            )}
          </div>
        ) : activeTab === 'search' ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Start typing to search for movies</p>
            {showBudget && (
              <p className="text-sm mt-2">
                Only movies with budgets ≥$100 will be shown
              </p>
            )}
          </div>
        ) : cachedLists[activeTab as Exclude<TabType, 'search'>]?.error ? (
          <div className="text-center py-8 text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium mb-2">Failed to load movies</p>
            <p className="text-sm text-gray-600 mb-4">
              {cachedLists[activeTab as Exclude<TabType, 'search'>].error}
            </p>
            <Button
              onClick={() => {
                // Clear error and retry
                setCachedLists(prev => ({
                  ...prev,
                  [activeTab]: { movies: [], loaded: false, loading: false }
                }))
                if (activeTab !== 'search') {
                  fetchMovieList(activeTab)
                }
              }}
              variant="outline"
              size="sm"
              className="text-cinema-red border-cinema-red hover:bg-cinema-red/5"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Film className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>
              {activeTab === 'now_playing' && 'Movies currently in theaters'}
              {activeTab === 'popular' && 'Most popular movies'}
              {activeTab === 'top_rated' && 'Highest rated movies'}
              {activeTab === 'upcoming' && 'Coming soon to theaters'}
            </p>
            {showBudget && (
              <p className="text-sm mt-2">
                Only movies with budgets ≥$100 are shown for Budget Bracket
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected Movie Usage & Selection - Fixed at bottom */}
      {selectedMovie && (
        <div className="border-t pt-4 mt-4 bg-white flex-shrink-0 max-h-48 overflow-y-auto">
          <Card className="p-4 bg-cinema-red/5 border-cinema-red/20">
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
                    className="bg-cinema-red text-white border border-cinema-red transition-all duration-200 hover:bg-white hover:text-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)] hover:-translate-y-0.5"
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