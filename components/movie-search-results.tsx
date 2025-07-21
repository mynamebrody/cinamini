"use client"

import { Star, Calendar, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { MovieSearchResult } from '@/lib/types/tmdb'

interface MovieSearchResultsProps {
  results: MovieSearchResult[]
  loading?: boolean
  error?: string | null
  totalResults?: number
  searchQuery?: string
}

// Loading skeleton component
function MovieCardSkeleton() {
  return (
    <Card className="bg-background/50 backdrop-blur-sm border-white/20 overflow-hidden">
      <div className="aspect-[2/3] relative">
        <Skeleton className="w-full h-full" />
      </div>
      <CardHeader className="p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

// Individual movie card component
function MovieCard({ movie }: { movie: MovieSearchResult }) {
  return (
    <Card className="bg-background/50 backdrop-blur-sm border-white/20 hover:border-[#2b725e]/50 transition-all duration-200 overflow-hidden group">
      {/* Movie Poster */}
      <div className="aspect-[2/3] relative overflow-hidden">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No Image</p>
            </div>
          </div>
        )}
        
        {/* Rating Badge */}
        {movie.rating > 0 && (
          <Badge className="absolute top-2 right-2 bg-black/70 text-white border-none">
            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
            {movie.rating}
          </Badge>
        )}
      </div>

      {/* Movie Info */}
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-semibold text-white line-clamp-2 leading-tight">
          {movie.title}
        </CardTitle>
        <CardDescription className="text-gray-400 flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {movie.releaseYear}
          </span>
          {movie.voteCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {movie.voteCount.toLocaleString()} votes
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
          {movie.overview}
        </p>
      </CardContent>
    </Card>
  )
}

export function MovieSearchResults({ 
  results, 
  loading = false, 
  error = null, 
  totalResults = 0,
  searchQuery
}: MovieSearchResultsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-red-400 text-lg font-semibold mb-2">
            Search Error
          </div>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-gray-400 text-sm">
            Please try again with a different search term.
          </p>
        </div>
      </div>
    )
  }

  // No results state
  if (results.length === 0 && searchQuery) {
    return (
      <div className="w-full text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-white text-lg font-semibold mb-2">
            No Movies Found
          </div>
          <p className="text-gray-300 mb-4">
            No movies found for "{searchQuery}"
          </p>
          <p className="text-gray-400 text-sm">
            Try searching for a different movie title or check your spelling.
          </p>
        </div>
      </div>
    )
  }

  // Results found
  if (results.length > 0) {
    return (
      <div className="w-full">
        {/* Results header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Search Results for "{searchQuery}"
          </h2>
          <p className="text-gray-400 text-sm">
            Found {totalResults.toLocaleString()} movies
          </p>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    )
  }

  // Default state (no search performed yet)
  return null
}