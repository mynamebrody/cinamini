"use client"

import { Film, Calendar, DollarSign, User, Edit3, X, Clock, Star, Building2, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MovieDetailsCardProps {
  movie: {
    id: number
    title: string
    poster_path: string | null
    release_date: string
    budget?: number
    revenue?: number
    director?: string
    writer?: string
    runtime?: number
    vote_average?: number
    overview?: string
    tagline?: string | null
    status?: string | null
    genres?: Array<{ id: number; name: string }>
    production_companies?: Array<{
      id: number
      name: string
      logo_path: string | null
      origin_country: string
    }>
    main_cast?: Array<{
      name: string
      character: string
      order: number
    }>
  }
  onRemove?: () => void
  compact?: boolean
  showFullDetails?: boolean
}

export default function MovieDetailsCard({ movie, onRemove, compact = false, showFullDetails = false }: MovieDetailsCardProps) {
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null

  // Enhanced compact view with more details
  if (compact && !showFullDetails) {
    return (
      <Card className="p-3">
        <div className="flex items-start gap-3">
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
              alt={movie.title}
              className="w-16 h-24 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-gray-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1">{movie.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {releaseYear && (
                <p className="text-xs text-gray-500">{releaseYear}</p>
              )}
              {movie.runtime && (
                <p className="text-xs text-gray-500">• {movie.runtime}min</p>
              )}
              {movie.vote_average && movie.vote_average > 0 && (
                <p className="text-xs text-gray-500">• ⭐ {movie.vote_average.toFixed(1)}</p>
              )}
            </div>
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {movie.genres.slice(0, 2).map(genre => (
                  <Badge key={genre.id} variant="outline" className="text-xs h-5 px-1.5">
                    {genre.name}
                  </Badge>
                ))}
                {movie.genres.length > 2 && (
                  <Badge variant="outline" className="text-xs h-5 px-1.5">
                    +{movie.genres.length - 2}
                  </Badge>
                )}
              </div>
            )}
            <div className="space-y-0.5 mt-1">
              {movie.budget && movie.budget > 0 && (
                <p className="text-xs text-green-600 font-medium">
                  💰 ${(movie.budget / 1000000).toFixed(1)}M budget
                </p>
              )}
              {movie.director && (
                <p className="text-xs text-gray-600">
                  🎬 {movie.director}
                </p>
              )}
            </div>
          </div>
          
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Poster */}
        <div className="flex-shrink-0">
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
              alt={movie.title}
              className="w-[185px] h-[278px] object-cover"
            />
          ) : (
            <div className="w-[185px] h-[278px] bg-gray-200 flex items-center justify-center">
              <Film className="w-10 h-10 text-gray-400" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-xl">{movie.title}</h3>
              {movie.tagline && (
                <p className="text-sm text-gray-600 italic mt-1">&quot;{movie.tagline}&quot;</p>
              )}
              
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                {releaseYear && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{releaseYear}</span>
                  </div>
                )}
                {movie.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{movie.runtime} min</span>
                  </div>
                )}
                {movie.vote_average && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" />
                    <span>{movie.vote_average.toFixed(1)}/10</span>
                  </div>
                )}
                {movie.status && (
                  <Badge variant={movie.status === 'Released' ? 'default' : 'secondary'}>
                    {movie.status}
                  </Badge>
                )}
              </div>
            </div>
            
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map(genre => (
                <Badge key={genre.id} variant="outline" className="text-xs">
                  {genre.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Financial Info */}
          {(movie.budget || movie.revenue) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              {movie.budget && movie.budget > 0 && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Budget
                  </p>
                  <p className="text-sm font-medium text-green-600">
                    ${(movie.budget / 1000000).toFixed(1)}M
                  </p>
                </div>
              )}
              {movie.revenue && movie.revenue > 0 && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Revenue
                  </p>
                  <p className="text-sm font-medium">
                    ${(movie.revenue / 1000000).toFixed(1)}M
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-1">Overview</p>
              <p className="text-sm text-gray-700 line-clamp-3">{movie.overview}</p>
            </div>
          )}

          {/* Credits */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            {movie.director && (
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Director</p>
                  <p className="text-sm font-medium">{movie.director}</p>
                </div>
              </div>
            )}
            {movie.writer && (
              <div className="flex items-start gap-2">
                <Edit3 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Writer</p>
                  <p className="text-sm font-medium line-clamp-1">{movie.writer}</p>
                </div>
              </div>
            )}
          </div>

          {/* Main Cast */}
          {movie.main_cast && movie.main_cast.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Main Cast
              </p>
              <div className="space-y-1">
                {movie.main_cast.map((actor, idx) => (
                  <div key={`cast-${actor.name || actor.id}-${idx}`} className="text-sm">
                    <span className="font-medium">{actor.name}</span>
                    <span className="text-gray-500"> as {actor.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Companies */}
          {movie.production_companies && movie.production_companies.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Production Companies
              </p>
              <div className="flex flex-wrap gap-2">
                {movie.production_companies.slice(0, 3).map(company => (
                  <Badge key={company.id} variant="secondary" className="text-xs">
                    {company.name}
                  </Badge>
                ))}
                {movie.production_companies.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{movie.production_companies.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}