"use client"

import { useState } from 'react'
import Image from 'next/image'
import { X, GripVertical, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FavoriteMovieSlotProps {
  movieId?: number
  title?: string
  posterPath?: string | null
  position: number
  onRemove?: () => void
  onAddClick?: () => void
  isDragging?: boolean
  isDragOver?: boolean
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'

export function FavoriteMovieSlot({
  movieId,
  title,
  posterPath,
  position,
  onRemove,
  onAddClick,
  isDragging = false,
  isDragOver = false
}: FavoriteMovieSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isEmpty = !movieId

  if (isEmpty) {
    return (
      <button
        onClick={onAddClick}
        className={cn(
          "relative aspect-[2/3] w-full border-2 border-dashed",
          "bg-gray-50 transition-all duration-200",
          "flex flex-col items-center justify-center gap-2",
          "hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]",
          "hover:bg-gray-100",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isDragOver && "border-primary bg-primary/10 scale-105",
          "border-gray-300"
        )}
        style={{ borderRadius: 0 }}
        aria-label={`Add movie to position ${position}`}
      >
        <Plus className="h-8 w-8 text-gray-400 hover:text-cinema-red transition-colors" />
        <span className="text-sm text-gray-500 hover:text-cinema-red transition-colors">Add Favorite</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full rounded-lg overflow-hidden",
        "bg-gray-100 transition-all duration-200",
        "group cursor-move",
        isDragging && "opacity-50 scale-95",
        isDragOver && "ring-2 ring-primary ring-offset-2 scale-105",
        isHovered && !isDragging && "shadow-lg scale-105"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Movie Poster */}
      {posterPath && !imageError ? (
        <Image
          src={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
          alt={title || 'Movie poster'}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 150px"
          className="object-cover"
          onError={() => setImageError(true)}
          priority={position <= 2}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <span className="text-gray-400 text-center px-4">
            {title || 'No poster'}
          </span>
        </div>
      )}

      {/* Hover Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "flex flex-col justify-between p-3"
        )}
      >
        {/* Top Controls */}
        <div className="flex justify-between items-start">
          <div className="p-1.5 bg-black/50 rounded-md opacity-75">
            <GripVertical className="h-4 w-4 text-white" />
          </div>
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-1.5 bg-cinema-red hover:bg-cinema-red transition-colors"
              style={{ borderRadius: 0 }}
              aria-label={`Remove ${title} from favorites`}
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}
        </div>

        {/* Bottom Title */}
        <div className="text-white">
          <p className="text-sm font-medium line-clamp-2">{title}</p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {!posterPath && !imageError && (
        <div className="absolute inset-0 animate-pulse bg-gray-300" />
      )}
    </div>
  )
}