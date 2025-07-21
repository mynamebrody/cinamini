"use client"

import { useState } from 'react'
import { Search, Star, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Movie {
  id: number
  title: string
  release_date: string
  overview: string
  poster_path: string | null
  vote_average: number
  vote_count: number
}

interface SearchResults {
  results: Movie[]
  total_results: number
  total_pages: number
}

export default function MovieSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const searchMovies = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/movies/search?query=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to search movies')
      }

      const data: SearchResults = await response.json()
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchMovies(query)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchMovies(query)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).getFullYear().toString()
  }

  const getPosterUrl = (posterPath: string | null) => {
    if (!posterPath) return '/placeholder-movie.png'
    return `https://image.tmdb.org/t/p/w300${posterPath}`
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Movie Search</h2>
        
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for movies..."
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-[#2b725e]"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="bg-[#2b725e] hover:bg-[#235e4c] text-white"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-400 py-8">
            Searching for movies...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* No Results */}
        {hasSearched && !loading && !error && results.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No movies found. Try a different search term.
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((movie) => (
              <div
                key={movie.id}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="aspect-[2/3] relative bg-gray-700">
                  <img
                    src={getPosterUrl(movie.poster_path)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1QzE2MS4wNDYgMjI1IDE3MCAyMTYuMDQ2IDE3MCAyMDVDMTcwIDE5My45NTQgMTYxLjA0NiAxODUgMTUwIDE4NUMxMzguOTU0IDE4NSAxMzAgMTkzLjk1NCAxMzAgMjA1QzEzMCAyMTYuMDQ2IDEzOC45NTQgMjI1IDE1MCAyMjVaIiBmaWxsPSIjNkI3Mjg4Ii8+CjxwYXRoIGQ9Ik0xMjAgMjc1SDE4MEMxODMuMzE0IDI3NSAxODYgMjc3LjY4NiAxODYgMjgxVjI5NUMxODYgMjk4LjMxNCAxODMuMzE0IDMwMSAxODAgMzAxSDEyMEMxMTYuNjg2IDMwMSAxMTQgMjk4LjMxNCAxMTQgMjk1VjI4MUMxMTQgMjc3LjY4NiAxMTYuNjg2IDI3NSAxMjAgMjc1WiIgZmlsbD0iIzZCNzI4OCIvPgo8L3N2Zz4K'
                    }}
                  />
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">
                    {movie.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(movie.release_date)}
                    </div>
                    {movie.vote_average > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {movie.vote_average.toFixed(1)}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-300 text-sm line-clamp-3">
                    {movie.overview || 'No description available.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}