"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Movie {
  id: number
  title: string
  releaseYear: string
  posterUrl: string | null
}

interface PosterPixelsSearchProps {
  onMovieSelect: (movie: { id: number; title: string } | null) => void
  selectedMovie: { id: number; title: string } | null
  disabled?: boolean
}

export default function PosterPixelsSearch({
  onMovieSelect,
  selectedMovie,
  disabled = false,
}: PosterPixelsSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      searchMovies(debouncedSearchQuery)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [debouncedSearchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const searchMovies = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok && data.results) {
        setSearchResults(data.results.slice(0, 8)) // Limit to 8 results
        setShowDropdown(true)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("Error searching movies:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleMovieSelect = (movie: Movie) => {
    onMovieSelect({ id: movie.id, title: movie.title })
    setSearchQuery(movie.title)
    setShowDropdown(false)
  }

  const handleClear = () => {
    setSearchQuery("")
    onMovieSelect(null)
    setSearchResults([])
    setShowDropdown(false)
  }

  const getReleaseYear = (releaseYear: string) => {
    return releaseYear || "Unknown"
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search for a movie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10 pr-10 py-2 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto backdrop-blur-sm">
          {searchResults.map((movie) => (
            <button
              key={movie.id}
              onClick={() => handleMovieSelect(movie)}
              className="w-full px-4 py-3 hover:bg-gray-100 transition-colors text-left flex items-center gap-3"
            >
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-10 h-14 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center">
                  <Search className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-gray-900 font-medium">
                  {movie.title} 
                  {movie.releaseYear && movie.releaseYear !== 'Unknown' && (
                    <span className="text-gray-600"> ({movie.releaseYear})</span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Movie Display */}
      {selectedMovie && !showDropdown && (
        <div className="mt-2 p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
          <p className="text-sm text-purple-300">
            Selected: <span className="font-medium">{selectedMovie.title}</span>
          </p>
        </div>
      )}
    </div>
  )
}