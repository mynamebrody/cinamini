"use client"

import { useState, useCallback } from 'react'
import { MovieSearchBar } from './movie-search-bar'
import { MovieSearchResults } from './movie-search-results'
import type { MovieSearchResponse, APIErrorResponse, MovieSearchResult } from '@/lib/types/tmdb'

export function MovieSearch() {
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const [currentQuery, setCurrentQuery] = useState<string>('')

  // Handle movie search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setCurrentQuery(query)

    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401) {
          throw new Error('You must be logged in to search for movies.')
        } else if (response.status === 500) {
          const errorData: APIErrorResponse = await response.json()
          throw new Error(errorData.error || 'Server error occurred.')
        } else {
          throw new Error('Failed to search movies. Please try again.')
        }
      }

      const data: MovieSearchResponse = await response.json()
      
      setSearchResults(data.results)
      setTotalResults(data.totalResults)
      
      // Clear any previous errors
      setError(null)
      
    } catch (err) {
      console.error('Movie search error:', err)
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      
      // Clear results on error
      setSearchResults([])
      setTotalResults(0)
      
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-8">
      {/* Search Bar */}
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Movie Search
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Search for your favorite movies using The Movie Database
          </p>
        </div>
        
        <MovieSearchBar
          onSearch={handleSearch}
          loading={loading}
          placeholder="Search for movies..."
        />
      </div>

      {/* Search Results */}
      <MovieSearchResults
        results={searchResults}
        loading={loading}
        error={error}
        totalResults={totalResults}
        searchQuery={currentQuery}
      />
    </div>
  )
}