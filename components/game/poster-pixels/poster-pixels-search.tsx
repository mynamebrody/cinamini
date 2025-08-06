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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Start typing to search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10 pr-10 bg-background text-foreground"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-80 overflow-y-auto backdrop-blur-sm">
          <div className="py-1">
            {searchResults.map((movie, index) => (
              <button
                key={movie.id}
                onClick={() => handleMovieSelect(movie)}
                className="w-full text-left px-3 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                {/* Movie Poster Placeholder */}
                <div className="flex-shrink-0 w-12 h-16 bg-muted rounded overflow-hidden">
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={`${movie.title} poster`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                
                {/* Movie Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {movie.title}
                  </div>
                  {movie.releaseYear && movie.releaseYear !== 'Unknown' && (
                    <div className="text-xs text-muted-foreground">
                      {movie.releaseYear}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Movie Display */}
      {selectedMovie && !showDropdown && (
        <div className="mt-3 p-3 bg-muted rounded border">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Selected movie:</p>
              <p className="text-sm font-medium">{selectedMovie.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}