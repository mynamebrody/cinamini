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
  onAutoSubmit?: (movie: { id: number; title: string }) => void
}

export default function PosterPixelsSearch({
  onMovieSelect,
  selectedMovie,
  disabled = false,
  onAutoSubmit,
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
    const selectedMovieData = { id: movie.id, title: movie.title }
    onMovieSelect(selectedMovieData)
    setSearchQuery(movie.title)
    setShowDropdown(false)
    
    // Auto-submit the guess if callback is provided, passing the movie data directly
    if (onAutoSubmit) {
      // Small delay to allow UI to update
      setTimeout(() => {
        onAutoSubmit(selectedMovieData)
      }, 50)
    }
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
          placeholder="🔍 Search the cinematic archives..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10 pr-10 py-3 bg-gradient-to-r from-white to-purple-50 border-2 border-purple-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl shadow-md transition-all duration-200 focus:shadow-lg focus:shadow-purple-500/10"
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

      {/* Search Results Dropdown - Art Gallery Style */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-gradient-to-b from-white to-purple-50 border-2 border-purple-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto backdrop-blur-sm">
          <div className="px-3 py-2 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs font-medium rounded-t-xl border-b border-purple-200">
            🎬 Cinematic Collection • {searchResults.length} masterpieces found
          </div>
          {searchResults.map((movie, index) => (
            <button
              key={movie.id}
              onClick={() => handleMovieSelect(movie)}
              className="w-full px-4 py-3 hover:bg-gradient-to-r hover:from-purple-100 hover:to-purple-50 transition-all duration-200 text-left group border-b border-purple-100/50 last:border-b-0 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold group-hover:scale-110 transition-transform duration-200">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium group-hover:text-purple-800 transition-colors">
                    🎭 {movie.title} 
                    {movie.releaseYear && movie.releaseYear !== 'Unknown' && (
                      <span className="text-gray-600 group-hover:text-purple-600"> ({movie.releaseYear})</span>
                    )}
                  </p>
                </div>
                <div className="text-purple-400 group-hover:text-purple-600 transition-colors">
                  ✨
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Movie Display - Art Gallery Plaque Style */}
      {selectedMovie && !showDropdown && (
        <div className="mt-3 p-3 bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-300 rounded-xl shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            <div>
              <p className="text-xs text-amber-700 font-medium">Masterpiece Selected for Restoration:</p>
              <p className="text-sm text-amber-800 font-bold">&ldquo;{selectedMovie.title}&rdquo;</p>
            </div>
            <span className="text-lg ml-auto">✨</span>
          </div>
        </div>
      )}
    </div>
  )
}