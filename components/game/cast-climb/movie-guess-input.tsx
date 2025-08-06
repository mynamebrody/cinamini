"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MovieSearchResult, MovieSearchResponse, APIErrorResponse } from '@/lib/types/tmdb'
import { cn } from '@/lib/utils'

interface MovieGuessInputProps {
  onGuess: (movie: MovieSearchResult) => void
  loading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function MovieGuessInput({ 
  onGuess, 
  loading = false, 
  placeholder = "Start typing to search movies...",
  disabled = false
}: MovieGuessInputProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Scroll dropdown into view
  const scrollDropdownIntoView = useCallback(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [])

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        if (response.status === 500) {
          const errorData: APIErrorResponse = await response.json()
          throw new Error(errorData.error || 'Server error occurred.')
        } else {
          throw new Error('Failed to search movies. Please try again.')
        }
      }

      const data: MovieSearchResponse = await response.json()
      setSearchResults(data.results.slice(0, 8)) // Limit to 8 results
      setShowResults(true)
      setSelectedIndex(-1)
      setError(null)
      
      // Scroll dropdown into view after a short delay to ensure it's rendered
      setTimeout(scrollDropdownIntoView, 100)
      
    } catch (err) {
      console.error('Movie search error:', err)
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      
      setSearchResults([])
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }, [scrollDropdownIntoView])

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, performSearch])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle movie selection
  const handleMovieSelect = (movie: MovieSearchResult) => {
    onGuess(movie)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    setSelectedIndex(-1)
  }

  // Scroll selected item into view
  const scrollSelectedIntoView = useCallback((index: number) => {
    if (resultsRef.current && index >= 0) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${index}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) return

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
        setShowResults(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true)
              // Scroll dropdown into view when focused
              setTimeout(scrollDropdownIntoView, 100)
            }
          }}
          className="pl-10 pr-10 bg-background text-foreground"
          disabled={loading || disabled}
          maxLength={100}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={loading || disabled}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-80 overflow-y-auto backdrop-blur-sm"
        >
          {error ? (
            <div className="p-3 text-sm text-red-500">
              {error}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((movie, index) => (
                <button
                  key={movie.id}
                  data-index={index}
                  onClick={() => handleMovieSelect(movie)}
                  className={cn(
                    "w-full text-left px-3 py-3 text-sm hover:bg-muted/50 transition-colors",
                    "flex items-center gap-3",
                    selectedIndex === index && "bg-muted"
                  )}
                >
                  {/* Movie Poster */}
                  <div className="flex-shrink-0 w-12 h-16 bg-muted rounded overflow-hidden">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl}
                        alt={`${movie.title} poster`}
                        width={48}
                        height={64}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Poster
                      </div>
                    )}
                  </div>
                  
                  {/* Movie Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {movie.title}
                    </div>
                    {movie.releaseYear && movie.releaseYear !== 'Unknown' && (
                      <div className="text-xs text-muted-foreground">
                        ({movie.releaseYear})
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !isSearching ? (
            <div className="p-3 text-sm text-muted-foreground">
              No movies found for "{searchQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}