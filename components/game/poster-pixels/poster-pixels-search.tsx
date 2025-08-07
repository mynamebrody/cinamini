"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface Movie {
  id: number
  title: string
  releaseYear: string
  posterUrl: string | null
  director?: string | null
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
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Scroll dropdown into view
  const scrollDropdownIntoView = useCallback(() => {
    if (dropdownRef.current) {
      dropdownRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [])

  // Scroll selected item into view
  const scrollSelectedIntoView = useCallback((index: number) => {
    if (dropdownRef.current && index >= 0) {
      const selectedElement = dropdownRef.current.querySelector(`[data-index="${index}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [])

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      searchMovies(debouncedSearchQuery)
    } else {
      setSearchResults([])
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }, [debouncedSearchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setSelectedIndex(-1)
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
        setSelectedIndex(-1)
        // Scroll dropdown into view after a short delay to ensure it's rendered
        setTimeout(scrollDropdownIntoView, 100)
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
    setSelectedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = selectedIndex < searchResults.length - 1 ? selectedIndex + 1 : 0
        setSelectedIndex(nextIndex)
        scrollSelectedIntoView(nextIndex)
        break
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : searchResults.length - 1
        setSelectedIndex(prevIndex)
        scrollSelectedIntoView(prevIndex)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleMovieSelect(searchResults[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
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
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowDropdown(true)
              // Scroll dropdown into view when focused
              setTimeout(scrollDropdownIntoView, 100)
            }
          }}
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
                data-index={index}
                onClick={() => handleMovieSelect(movie)}
                className={cn(
                  "w-full text-left px-3 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3",
                  selectedIndex === index && "bg-muted"
                )}
              >
                {/* Movie Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {movie.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {movie.releaseYear && movie.releaseYear !== 'Unknown' && (
                      <span>{movie.releaseYear}</span>
                    )}
                    {movie.director && (
                      <>
                        {movie.releaseYear && movie.releaseYear !== 'Unknown' && <span>•</span>}
                        <span>Dir. {movie.director}</span>
                      </>
                    )}
                  </div>
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