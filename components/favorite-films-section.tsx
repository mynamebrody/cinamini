"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { FavoriteMovieSlot } from './favorite-movie-slot'
import { MovieSearchModal } from './movie-search-modal'
import { toast } from 'sonner'
import type { MovieSearchResult } from '@/lib/types/tmdb'

interface FavoriteFilm {
  id: string
  movieId: number
  title: string
  posterPath: string | null
  position: number
  updatedAt: string
}

export function FavoriteFilmsSection() {
  const [favorites, setFavorites] = useState<FavoriteFilm[]>([])
  const [loading, setLoading] = useState(true)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<number | undefined>()
  const [draggedMovie, setDraggedMovie] = useState<FavoriteFilm | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const dragCounter = useRef(0)

  // Fetch user's favorite films
  const fetchFavorites = useCallback(async () => {
    try {
      const response = await fetch('/api/user/favorites')
      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }
      const data = await response.json()
      setFavorites(data.favorites)
    } catch (error) {
      console.error('Error fetching favorites:', error)
      toast.error('Failed to load favorite films')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // Add a movie to favorites
  const handleAddMovie = async (movie: MovieSearchResult, position?: number) => {
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          title: movie.title,
          posterPath: movie.posterUrl?.replace('https://image.tmdb.org/t/p/w185', '') || null,
          position
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add favorite')
      }

      await fetchFavorites()
    } catch (error) {
      console.error('Error adding favorite:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add favorite')
    }
  }

  // Remove a movie from favorites
  const handleRemoveMovie = async (movieId: number) => {
    try {
      const response = await fetch(`/api/user/favorites/${movieId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove favorite')
      }

      await fetchFavorites()
      toast.success('Removed from favorites')
    } catch (error) {
      console.error('Error removing favorite:', error)
      toast.error('Failed to remove favorite')
    }
  }

  // Handle drag start
  const handleDragStart = (movie: FavoriteFilm) => {
    setDraggedMovie(movie)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedMovie(null)
    setDragOverPosition(null)
    dragCounter.current = 0
  }

  // Handle drag enter
  const handleDragEnter = (position: number) => {
    dragCounter.current++
    if (draggedMovie && draggedMovie.position !== position) {
      setDragOverPosition(position)
    }
  }

  // Handle drag leave
  const handleDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverPosition(null)
    }
  }

  // Handle drop
  const handleDrop = async (targetPosition: number) => {
    if (!draggedMovie || draggedMovie.position === targetPosition) {
      handleDragEnd()
      return
    }

    // Optimistic update
    const newFavorites = [...favorites]
    const draggedIndex = newFavorites.findIndex(f => f.id === draggedMovie.id)
    const targetMovie = newFavorites.find(f => f.position === targetPosition)

    if (draggedIndex !== -1) {
      // If dropping on an occupied position, swap
      if (targetMovie) {
        newFavorites[draggedIndex] = { ...draggedMovie, position: targetPosition }
        const targetIndex = newFavorites.findIndex(f => f.id === targetMovie.id)
        newFavorites[targetIndex] = { ...targetMovie, position: draggedMovie.position }
      } else {
        // Dropping on empty position
        newFavorites[draggedIndex] = { ...draggedMovie, position: targetPosition }
      }
      
      setFavorites(newFavorites.sort((a, b) => a.position - b.position))
    }

    // Update on server
    try {
      const updates = targetMovie
        ? [
            { movieId: draggedMovie.movieId, position: targetPosition },
            { movieId: targetMovie.movieId, position: draggedMovie.position }
          ]
        : [{ movieId: draggedMovie.movieId, position: targetPosition }]

      const response = await fetch('/api/user/favorites/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        throw new Error('Failed to reorder favorites')
      }

      const data = await response.json()
      setFavorites(data.favorites)
    } catch (error) {
      console.error('Error reordering favorites:', error)
      toast.error('Failed to reorder favorites')
      // Revert optimistic update
      await fetchFavorites()
    } finally {
      handleDragEnd()
    }
  }

  // Open search modal for specific position
  const handleAddClick = (position: number) => {
    setSelectedPosition(position)
    setIsSearchModalOpen(true)
  }

  // Get favorite for a specific position
  const getFavoriteByPosition = (position: number) => {
    return favorites.find(f => f.position === position)
  }

  const existingMovieIds = favorites.map(f => f.movieId)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((position) => (
            <div key={position} className="aspect-[2/3] bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600">
          Showcase your favorite movies on your profile
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((position) => {
          const favorite = getFavoriteByPosition(position)
          const isDragOver = dragOverPosition === position && (!favorite || draggedMovie?.id !== favorite.id)
          
          return (
            <div
              key={position}
              draggable={!!favorite}
              onDragStart={() => favorite && handleDragStart(favorite)}
              onDragEnd={handleDragEnd}
              onDragEnter={() => handleDragEnter(position)}
              onDragLeave={handleDragLeave}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(position)
              }}
              className="relative"
            >
              <FavoriteMovieSlot
                movieId={favorite?.movieId}
                title={favorite?.title}
                posterPath={favorite?.posterPath}
                position={position}
                onRemove={favorite ? () => handleRemoveMovie(favorite.movieId) : undefined}
                onAddClick={() => handleAddClick(position)}
                isDragging={draggedMovie?.id === favorite?.id}
                isDragOver={isDragOver}
              />
            </div>
          )
        })}
      </div>

      <MovieSearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
        onMovieSelect={(movie) => handleAddMovie(movie, selectedPosition)}
        existingMovieIds={existingMovieIds}
        position={selectedPosition}
      />
    </div>
  )
}