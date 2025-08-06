"use client"

import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MovieSearchBar } from './movie-search-bar'
import { Heart, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import type { MovieSearchResult, MovieSearchResponse, APIErrorResponse } from '@/lib/types/tmdb'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MovieSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMovieSelect: (movie: MovieSearchResult) => void
  existingMovieIds: number[]
  position?: number
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185'

export function MovieSearchModal({
  open,
  onOpenChange,
  onMovieSelect,
  existingMovieIds,
  position
}: MovieSearchModalProps) {
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState<string>('')

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchResults([])
      setError(null)
      setCurrentQuery('')
    }
  }, [open])

  // Handle movie search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setCurrentQuery(query)

    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
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
      setError(null)
      
    } catch (err) {
      console.error('Movie search error:', err)
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMovieSelect = (movie: MovieSearchResult) => {
    onMovieSelect(movie)
    toast.success('Added to favorites!')
    // Close modal after short delay to show success
    setTimeout(() => {
      onOpenChange(false)
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[75vw] !h-[75vh] !max-w-none !max-h-none !min-h-0 overflow-hidden flex flex-col bg-white border-neutral-200" style={{ borderRadius: 0, width: '75vw', height: '75vh', maxWidth: 'none', maxHeight: 'none' }}>
        <DialogHeader className="relative">
          <DialogTitle className="text-neutral-900">
            Add Movie to Favorites
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-0 top-0 px-1 py-2 bg-transparent border border-transparent rounded-none hover:bg-transparent hover:border-[rgb(153,37,29)] hover:text-[rgb(153,37,29)] hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)] transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <MovieSearchBar
            onSearch={handleSearch}
            loading={loading}
            placeholder="Search for a movie to add..."
            className="w-full"
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3" style={{ borderRadius: 0 }}>
              <p className="text-sm text-cinema-red">{error}</p>
            </div>
          )}

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/3] bg-neutral-200" style={{ borderRadius: 0 }} />
                    <div className="mt-2 h-4 bg-neutral-200" style={{ borderRadius: 0 }} />
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <TooltipProvider>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1">
                  {searchResults.map((movie) => {
                    const isAlreadyFavorited = existingMovieIds.includes(movie.id)
                    const displayTitle = `${movie.title}${movie.releaseYear ? ` (${movie.releaseYear})` : ''}`
                    
                    return (
                      <Tooltip key={movie.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => !isAlreadyFavorited && handleMovieSelect(movie)}
                            disabled={isAlreadyFavorited}
                            className={cn(
                              "group relative text-left transition-all duration-200",
                              "focus:outline-none focus:ring-2 focus:ring-cinema-red focus:ring-offset-2 rounded-lg",
                              isAlreadyFavorited
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:scale-105"
                            )}
                          >
                            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-100">
                              {movie.posterUrl ? (
                                <Image
                                  src={movie.posterUrl}
                                  alt={movie.title}
                                  fill
                                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-neutral-400 text-xs font-funnel">No poster</span>
                                </div>
                              )}
                              
                              {/* Overlay */}
                              <div className={cn(
                                "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity",
                                "flex items-center justify-center",
                                isAlreadyFavorited && "opacity-100"
                              )}>
                                {isAlreadyFavorited ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Check className="h-6 w-6 text-green-500" />
                                    <span className="text-xs text-white font-funnel">Already Added</span>
                                  </div>
                                ) : (
                                  <Heart className="h-6 w-6 text-white" />
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 px-1 pb-1">
                              <h3 className="font-funnel text-xs leading-tight line-clamp-2 text-neutral-900 min-h-[2.5rem]">
                                {displayTitle}
                              </h3>
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          className="bg-white border-neutral-200 text-neutral-900 max-w-xs font-funnel"
                        >
                          <p className="text-sm">{displayTitle}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </TooltipProvider>
            ) : currentQuery && !loading ? (
              <div className="text-center py-8">
                <p className="text-neutral-500 font-funnel">
                  No movies found for "{currentQuery}"
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-500 font-funnel">
                  Search for a movie to add to your favorites
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}