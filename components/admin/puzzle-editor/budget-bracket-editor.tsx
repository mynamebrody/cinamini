"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Calendar, Save, Loader2, Plus, X, DollarSign, Film, ArrowRight, GripVertical, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import MovieSelector from "../shared/movie-selector"
import MovieDetailsCard from "../shared/movie-details-card"
import PuzzlePreview from "../shared/puzzle-preview"
import { cn } from "@/lib/utils"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import {
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  budget?: number
  revenue?: number
  runtime?: number
  director?: string
  writer?: string
  vote_average?: number
}

interface MoviePair {
  movieA: Movie | null
  movieB: Movie | null
}

const TOTAL_PAIRS = 5 // 5 pairs for a single game

// Regular MovieCard for non-draggable instances
function MovieCard({ movie }: { movie: Movie }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2 h-full">
      <div className="flex gap-2">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
            alt={movie.title}
            className="w-12 h-18 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
            <Film className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium line-clamp-2 leading-tight">{movie.title}</p>
          {movie.release_date && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              {new Date(movie.release_date).getFullYear()}
            </p>
          )}
          {movie.budget && movie.budget > 0 && (
            <p className="text-xs text-green-600 font-semibold mt-1">
              ${(movie.budget / 1000000).toFixed(0)}M
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Draggable MovieCard component
function DraggableMovieCard({ movie, dragId, onRemove }: { 
  movie: Movie, 
  dragId: string, 
  onRemove: () => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: dragId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 z-10"
      )}
      {...attributes}
      {...listeners}
    >
      <div className={cn(
        "bg-white rounded-lg border border-gray-200 p-2 h-full transition-all duration-200",
        isDragging ? "shadow-lg border-cinema-red" : "hover:shadow-md"
      )}>
        <div className="flex gap-2">
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
              alt={movie.title}
              className="w-12 h-18 object-cover rounded flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
              <Film className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium line-clamp-2 leading-tight">{movie.title}</p>
            {movie.release_date && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                {new Date(movie.release_date).getFullYear()}
              </p>
            )}
            {movie.budget && movie.budget > 0 && (
              <p className="text-xs text-green-600 font-semibold mt-1">
                ${(movie.budget / 1000000).toFixed(0)}M
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex items-start">
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-1 right-1 p-1 bg-white/90 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// Draggable Round component
function DraggableRound({ 
  pairIndex, 
  pair, 
  onOpenMovieSelector,
  onRemoveMovie,
  isDragDisabled = false 
}: {
  pairIndex: number
  pair: MoviePair
  onOpenMovieSelector: (pairIndex: number, slot: "A" | "B") => void
  onRemoveMovie: (pairIndex: number, slot: "A" | "B") => void
  isDragDisabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: `round-${pairIndex}`,
    disabled: isDragDisabled
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDragging && "opacity-50 z-10",
        !isDragDisabled && "cursor-grab active:cursor-grabbing"
      )}
      {...(!isDragDisabled ? attributes : {})}
      {...(!isDragDisabled ? listeners : {})}
    >
      <Card className={cn(
        "p-4 transition-all duration-200",
        isDragging ? "shadow-lg border-cinema-red" : "hover:shadow-md"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 text-sm font-medium text-gray-600 w-20 flex items-center gap-2">
            {!isDragDisabled && <GripVertical className="w-4 h-4 text-gray-400" />}
            Round {pairIndex + 1}
          </div>
          
          {/* Movie A */}
          <div className="flex-1 max-w-[200px]">
            {pair.movieA ? (
              <DraggableMovieCard 
                movie={pair.movieA}
                dragId={`movie-${pairIndex}-A`}
                onRemove={() => onRemoveMovie(pairIndex, "A")}
              />
            ) : (
              <button
                onClick={() => onOpenMovieSelector(pairIndex, "A")}
                className="w-full h-[82px] bg-gray-100 rounded-lg border-2 border-dashed border border-[rgb(var(--silver))] hover:border-gray-400 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-5 h-5 mb-0.5" />
                <span className="text-xs">Add Movie</span>
              </button>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="text-sm font-medium text-gray-500">VS</div>
          </div>

          {/* Movie B */}
          <div className="flex-1 max-w-[200px]">
            {pair.movieB ? (
              <DraggableMovieCard 
                movie={pair.movieB}
                dragId={`movie-${pairIndex}-B`}
                onRemove={() => onRemoveMovie(pairIndex, "B")}
              />
            ) : (
              <button
                onClick={() => onOpenMovieSelector(pairIndex, "B")}
                className="w-full h-[82px] bg-gray-100 rounded-lg border-2 border-dashed border border-[rgb(var(--silver))] hover:border-gray-400 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-5 h-5 mb-0.5" />
                <span className="text-xs">Add Movie</span>
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

interface BudgetBracketEditorProps {
  prefilledDate?: string | null
  onDateChange?: (date: string | null) => void
  puzzleId?: string | null
  // Note: Budget Bracket doesn't use movieId since it generates random pairs
}

export default function BudgetBracketEditor({ prefilledDate, onDateChange, puzzleId }: BudgetBracketEditorProps) {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [moviePairs, setMoviePairs] = useState<MoviePair[]>(
    Array(TOTAL_PAIRS).fill(null).map(() => ({ movieA: null, movieB: null }))
  )
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<{
    pairIndex: number
    slot: "A" | "B"
  } | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragOverMovie, setDragOverMovie] = useState<string | null>(null)

  // Auto-fill state
  const [cachedMovies, setCachedMovies] = useState<Movie[]>([])
  const [recentlyUsedMovies, setRecentlyUsedMovies] = useState<Set<number>>(new Set())
  const [autoFilling, setAutoFilling] = useState(false)
  const [cachedMoviesLoaded, setCachedMoviesLoaded] = useState(false)

  const supabase = getSupabaseClient()

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMovieSelector) {
        setShowMovieSelector(false)
        setSelectedPosition(null)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showMovieSelector])

  // Handle prefilled date from URL parameters
  useEffect(() => {
    if (prefilledDate && !isEditMode) {
      setPuzzleDate(prefilledDate)
      setIsPublished(true) // Auto-publish when date is set
    }
  }, [prefilledDate, isEditMode])

  // Load existing puzzle data if puzzleId is provided
  useEffect(() => {
    if (puzzleId) {
      loadPuzzleData(puzzleId)
    }
  }, [puzzleId])

  // Load recently used movies and cached movies on component mount
  useEffect(() => {
    fetchRecentlyUsedMovies()
    fetchCachedMovies() // Also preload cached movies
  }, [])

  const loadPuzzleData = async (puzzleId: string) => {
    setLoadingPuzzle(true)
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=budget_bracket`)
      
      if (!response.ok) {
        throw new Error('Failed to load puzzle data')
      }
      
      const response_data = await response.json()
      
      // Extract puzzle data from the response
      const puzzleData = response_data.puzzle
      
      // Set edit mode
      setIsEditMode(true)
      
      // Load puzzle fields
      setPuzzleDate(puzzleData.puzzle_date || "")
      setIsPublished(!!puzzleData.puzzle_date) // Published if it has a date
      
      // Parse and load movie pairs
      if (puzzleData.pairs) {
        const loadedPairs = puzzleData.pairs.map((pair: any) => ({
          movieA: pair.movieA ? {
            id: pair.movieA.id,
            title: pair.movieA.title,
            poster_path: pair.movieA.poster_path,
            release_date: pair.movieA.release_date,
            budget: pair.movieA.budget || pair.movieA.production_budget, // Map production_budget to budget
            revenue: pair.movieA.revenue,
            runtime: pair.movieA.runtime,
            vote_average: pair.movieA.vote_average
          } : null,
          movieB: pair.movieB ? {
            id: pair.movieB.id,
            title: pair.movieB.title,
            poster_path: pair.movieB.poster_path,
            release_date: pair.movieB.release_date,
            budget: pair.movieB.budget || pair.movieB.production_budget, // Map production_budget to budget
            revenue: pair.movieB.revenue,
            runtime: pair.movieB.runtime,
            vote_average: pair.movieB.vote_average
          } : null
        }))
        
        // Ensure we have exactly 5 pairs
        while (loadedPairs.length < TOTAL_PAIRS) {
          loadedPairs.push({ movieA: null, movieB: null })
        }
        
        setMoviePairs(loadedPairs)
      }
      
    } catch (error) {
      console.error('Error loading puzzle:', error)
      alert('Failed to load puzzle data. Please try again.')
    } finally {
      setLoadingPuzzle(false)
    }
  }

  const fetchRecentlyUsedMovies = async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0]

      const usedMovieIds = new Set<number>()

      // Check retitled puzzles
      const { data: retitledData } = await supabase
        .from('retitled_puzzles')
        .select('film_id')
        .gte('puzzle_date', dateStr)

      if (retitledData) {
        retitledData.forEach(puzzle => usedMovieIds.add(puzzle.film_id))
      }

      // Check cast climb puzzles
      const { data: castClimbData } = await supabase
        .from('cast_climb_puzzles')
        .select('film_id')
        .gte('puzzle_date', dateStr)

      if (castClimbData) {
        castClimbData.forEach(puzzle => usedMovieIds.add(puzzle.film_id))
      }

      // Check budget bracket puzzles
      const { data: budgetBracketData } = await supabase
        .from('budget_bracket_puzzles')
        .select('pairs')
        .gte('puzzle_date', dateStr)

      if (budgetBracketData) {
        budgetBracketData.forEach(puzzle => {
          if (puzzle.pairs) {
            puzzle.pairs.forEach((pair: any) => {
              if (pair.movieA?.id) usedMovieIds.add(pair.movieA.id)
              if (pair.movieB?.id) usedMovieIds.add(pair.movieB.id)
            })
          }
        })
      }

      // Check poster pixels puzzles
      const { data: posterPixelsData } = await supabase
        .from('poster_pixels_puzzles')
        .select('film_id')
        .gte('puzzle_date', dateStr)

      if (posterPixelsData) {
        posterPixelsData.forEach(puzzle => {
          if (puzzle.film_id) usedMovieIds.add(puzzle.film_id)
        })
      }

      setRecentlyUsedMovies(usedMovieIds)
      console.log('Recently used movies in last 30 days:', usedMovieIds.size)

    } catch (error) {
      console.error('Error fetching recently used movies:', error)
    }
  }

  const fetchCachedMovies = async () => {
    if (cachedMoviesLoaded) return

    try {
      const endpoints = [
        '/api/movies/popular',
        '/api/movies/top-rated',
        '/api/movies/now-playing'
      ]

      const moviePool: Movie[] = []
      
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          const movies = data.results || []
          moviePool.push(...movies)
        }
      }

      // Remove duplicates and filter by budget requirements
      const uniqueMovies = Array.from(
        new Map(moviePool.map(movie => [movie.id, movie])).values()
      ).filter(movie => {
        // Must have valid budget >= $100
        return movie.budget && typeof movie.budget === 'number' && movie.budget >= 100
      })

      setCachedMovies(uniqueMovies)
      setCachedMoviesLoaded(true)
      console.log('Cached movies loaded:', uniqueMovies.length)

    } catch (error) {
      console.error('Error fetching cached movies:', error)
    }
  }

  // Auto-publish when date is manually set
  const handleDateChange = (date: string) => {
    setPuzzleDate(date)
    if (date) {
      setIsPublished(true)
    } else {
      setIsPublished(false)
    }
    // Notify parent of date change
    onDateChange?.(date || null)
  }

  // Handle published toggle change - clear date when switching to draft
  const handlePublishedChange = (published: boolean) => {
    setIsPublished(published)
    if (!published) {
      // When switching to draft, clear the date
      setPuzzleDate("")
      onDateChange?.(null)
    }
  }

  const handleSelectMovie = (movie: Movie) => {
    if (selectedPosition) {
      const newPairs = [...moviePairs]
      newPairs[selectedPosition.pairIndex] = {
        ...newPairs[selectedPosition.pairIndex],
        [`movie${selectedPosition.slot}`]: movie
      }
      setMoviePairs(newPairs)
      setSelectedPosition(null)
    }
    setShowMovieSelector(false)
  }

  const removeMovie = (pairIndex: number, slot: "A" | "B") => {
    const newPairs = [...moviePairs]
    newPairs[pairIndex] = {
      ...newPairs[pairIndex],
      [`movie${slot}`]: null
    }
    setMoviePairs(newPairs)
  }

  const openMovieSelector = (pairIndex: number, slot: "A" | "B") => {
    setSelectedPosition({ pairIndex, slot })
    setShowMovieSelector(true)
  }

  const getUsedMovieIds = (): number[] => {
    const ids: number[] = []
    moviePairs.forEach(pair => {
      if (pair.movieA) ids.push(pair.movieA.id)
      if (pair.movieB) ids.push(pair.movieB.id)
    })
    return ids
  }

  // Helper function to fetch movies with cascading fallback: similar → recommendations → trending
  const fetchMoviesWithFallback = async (movieId: number): Promise<Movie[]> => {
    const endpoints = [
      { name: 'similar', url: `/api/movies/${movieId}/similar` },
      { name: 'recommendations', url: `/api/movies/${movieId}/recommendations` },
      { name: 'trending', url: `/api/movies/trending` }
    ]
    
    let allMovies: Movie[] = []
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying ${endpoint.name} movies...`)
        const response = await fetch(endpoint.url)
        
        if (response.ok) {
          const data = await response.json()
          const movies = data.results || []
          console.log(`${endpoint.name} returned ${movies.length} movies`)
          
          if (movies.length > 0) {
            allMovies.push(...movies)
            
            // Stop if we have enough movies (let's aim for at least 20 total)
            if (allMovies.length >= 20) {
              console.log(`Collected ${allMovies.length} movies, stopping cascade`)
              break
            }
          }
        } else {
          console.log(`${endpoint.name} API failed with status:`, response.status)
        }
      } catch (error) {
        console.log(`Error fetching ${endpoint.name} movies:`, error)
      }
    }
    
    // Remove duplicates based on movie ID
    const uniqueMovies = allMovies.filter((movie, index, arr) => 
      arr.findIndex(m => m.id === movie.id) === index
    )
    
    console.log(`Final cascaded movie count: ${uniqueMovies.length}`)
    return uniqueMovies
  }

  const autoFillPairs = async () => {
    setAutoFilling(true)
    
    try {
      // Ensure cached movies are loaded
      await fetchCachedMovies()
      
      // Get currently used movie IDs
      const usedIds = getUsedMovieIds()
      
      // Count empty slots
      let emptySlots = 0
      moviePairs.forEach(pair => {
        if (!pair.movieA) emptySlots++
        if (!pair.movieB) emptySlots++
      })
      
      if (emptySlots === 0) {
        console.log('All slots are filled')
        return
      }

      let availableMovies: Movie[] = []

      // Check if we have any movies selected already
      const hasSelectedMovies = usedIds.length > 0
      
      if (hasSelectedMovies) {
        // Use cascading movie discovery: similar → recommendations → trending
        const firstMovieId = usedIds[0]
        console.log('Fetching movies for:', firstMovieId)
        
        availableMovies = await fetchMoviesWithFallback(firstMovieId)
      } else {
        // Start with 0 selected movies: pick random from popular, then get similar movies
        console.log('No movies selected, picking random movie from cached popular list')
        
        // Ensure cached movies are loaded
        await fetchCachedMovies()
        
        if (cachedMovies.length === 0) {
          console.log('No cached movies available, cannot auto-fill')
          alert('No movies available for auto-fill. Please try again later or manually select movies.')
          return
        }
        
        // Filter out recently used movies first
        const availableCachedMovies = cachedMovies.filter(movie => {
          return !recentlyUsedMovies.has(movie.id)
        })
        
        const moviesToChooseFrom = availableCachedMovies.length > 0 ? availableCachedMovies : cachedMovies
        
        // Pick a random movie from the available cached movies
        const randomIndex = Math.floor(Math.random() * moviesToChooseFrom.length)
        const baseMovie = moviesToChooseFrom[randomIndex]
        
        console.log('Using random base movie for cascading discovery:', baseMovie.title, '(', baseMovie.id, ')')
        
        try {
          availableMovies = await fetchMoviesWithFallback(baseMovie.id)
          // Include the base movie as first option
          availableMovies.unshift(baseMovie)
          console.log('Total movies after cascade:', availableMovies.length)
        } catch (error) {
          console.log('Error in cascading movie fetch, using cached movies')
          availableMovies = [baseMovie, ...cachedMovies]
        }
      }

      // Add debugging to see what we have
      console.log('Available movies count:', availableMovies.length)
      console.log('Recently used movie IDs:', Array.from(recentlyUsedMovies))
      console.log('Currently used movie IDs:', usedIds)
      
      // Filter out recently used and already selected movies
      let filteredMovies = availableMovies.filter(movie => {
        const notRecentlyUsed = !recentlyUsedMovies.has(movie.id)
        const notCurrentlyUsed = !usedIds.includes(movie.id)
        const hasBudget = movie.budget && typeof movie.budget === 'number' && movie.budget >= 100
        
        if (!notRecentlyUsed) {
          console.log(`Filtered out ${movie.title} (${movie.id}) - recently used`)
        }
        if (!notCurrentlyUsed) {
          console.log(`Filtered out ${movie.title} (${movie.id}) - currently used`)
        }
        if (!hasBudget) {
          console.log(`Filtered out ${movie.title} (${movie.id}) - budget issue:`, movie.budget)
        }
        
        return notRecentlyUsed && notCurrentlyUsed && hasBudget
      })
      
      console.log('Movies after filtering:', filteredMovies.length)
      
      // If no movies pass the strict filter, try a more lenient approach
      if (filteredMovies.length === 0) {
        console.log('Strict filtering failed, trying lenient approach...')
        
        // Try without budget requirement first (we can fetch details later)
        filteredMovies = availableMovies.filter(movie => {
          return !recentlyUsedMovies.has(movie.id) && 
                 !usedIds.includes(movie.id)
        })
        
        console.log('Movies after lenient filtering (no budget check):', filteredMovies.length)
        
        if (filteredMovies.length === 0) {
          console.log('No suitable movies found even with lenient filtering')
          alert('No suitable movies found. The similar movies API may have returned movies that are recently used or already selected.')
          return
        }
        
        // Take first few movies and fetch their details to check budgets
        const moviesToCheck = filteredMovies.slice(0, 15) // Check more movies to increase chances
        console.log('Fetching budget details for candidate movies...')
        
        const moviesWithBudgets = []
        for (const movie of moviesToCheck) {
          try {
            const response = await fetch(`/api/movies/${movie.id}/details`)
            if (response.ok) {
              const details = await response.json()
              if (details.budget && details.budget >= 100) {
                moviesWithBudgets.push({
                  ...movie,
                  budget: details.budget,
                  revenue: details.revenue,
                  runtime: details.runtime
                })
                
                // Stop when we have enough movies for all slots
                if (moviesWithBudgets.length >= 10) break
              }
            }
          } catch (error) {
            console.log(`Failed to fetch details for ${movie.title}:`, error)
          }
        }
        
        filteredMovies = moviesWithBudgets
        console.log('Final movies with valid budgets:', filteredMovies.length)
      }

      if (filteredMovies.length === 0) {
        console.log('No suitable movies found for auto-fill after all attempts')
        alert('No suitable movies found with budgets ≥ $100. Try manually selecting movies or wait for the cached movie list to update.')
        return
      }

      // Shuffle the filtered movies for randomness
      const shuffledMovies = filteredMovies.sort(() => Math.random() - 0.5)

      // Fill empty slots
      const newPairs = [...moviePairs]
      let movieIndex = 0

      for (let pairIdx = 0; pairIdx < newPairs.length && movieIndex < shuffledMovies.length; pairIdx++) {
        const pair = newPairs[pairIdx]
        
        if (!pair.movieA && movieIndex < shuffledMovies.length) {
          pair.movieA = shuffledMovies[movieIndex]
          movieIndex++
        }
        
        if (!pair.movieB && movieIndex < shuffledMovies.length) {
          pair.movieB = shuffledMovies[movieIndex]
          movieIndex++
        }
      }

      setMoviePairs(newPairs)
      
      const filledSlots = Math.min(emptySlots, shuffledMovies.length)
      console.log(`Auto-filled ${filledSlots} movie slots`)

    } catch (error) {
      console.error('Error auto-filling movies:', error)
      alert('Failed to auto-fill movies. Please try again.')
    } finally {
      setAutoFilling(false)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    
    if (over) {
      setDragOverMovie(over.id as string)
    } else {
      setDragOverMovie(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDragOverMovie(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Handle round reordering (round-0, round-1, etc.)
    if (activeId.startsWith('round-') && overId.startsWith('round-')) {
      const oldIndex = parseInt(activeId.split('-')[1])
      const newIndex = parseInt(overId.split('-')[1])

      setMoviePairs(prev => {
        const newPairs = arrayMove(prev, oldIndex, newIndex)
        return newPairs
      })
      return
    }

    // Handle movie swapping (movie-0-A, movie-1-B, etc.)
    if (activeId.startsWith('movie-') && overId.startsWith('movie-')) {
      const [, activePairIdx, activeSlot] = activeId.split('-')
      const [, overPairIdx, overSlot] = overId.split('-')

      const activePairIndex = parseInt(activePairIdx)
      const overPairIndex = parseInt(overPairIdx)
      const activeMovieSlot = activeSlot as 'A' | 'B'
      const overMovieSlot = overSlot as 'A' | 'B'

      setMoviePairs(prev => {
        const newPairs = [...prev]
        const activeMovie = newPairs[activePairIndex][`movie${activeMovieSlot}`]
        const overMovie = newPairs[overPairIndex][`movie${overMovieSlot}`]

        // Swap the movies
        newPairs[activePairIndex] = {
          ...newPairs[activePairIndex],
          [`movie${activeMovieSlot}`]: overMovie
        }
        newPairs[overPairIndex] = {
          ...newPairs[overPairIndex],
          [`movie${overMovieSlot}`]: activeMovie
        }

        return newPairs
      })
      return
    }
  }

  // Get drag overlay content
  const getDragOverlay = () => {
    if (!activeId) return null

    if (activeId.startsWith('round-')) {
      const pairIndex = parseInt(activeId.split('-')[1])
      const pair = moviePairs[pairIndex]
      return (
        <Card className="p-4 shadow-lg border-cinema-red opacity-90">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 text-sm font-medium text-gray-600 w-20">
              Round {pairIndex + 1}
            </div>
            <div className="flex-1 max-w-[200px]">
              {pair.movieA && <MovieCard movie={pair.movieA} />}
            </div>
            <div className="flex-shrink-0">
              <div className="text-sm font-medium text-gray-500">VS</div>
            </div>
            <div className="flex-1 max-w-[200px]">
              {pair.movieB && <MovieCard movie={pair.movieB} />}
            </div>
          </div>
        </Card>
      )
    }

    if (activeId.startsWith('movie-')) {
      const [, pairIdx, slot] = activeId.split('-')
      const pairIndex = parseInt(pairIdx)
      const movieSlot = slot as 'A' | 'B'
      const movie = moviePairs[pairIndex][`movie${movieSlot}`]
      
      if (movie) {
        return (
          <div className="opacity-90">
            <MovieCard movie={movie} />
          </div>
        )
      }
    }

    return null
  }

  const savePuzzle = async () => {
    // Require date only if published
    if (isPublished && !puzzleDate) {
      alert("Published puzzles must have a puzzle date")
      return
    }

    const incompletePairs = moviePairs.filter(pair => !pair.movieA || !pair.movieB)
    
    if (incompletePairs.length > 0) {
      alert(`Please complete all movie pairs (${incompletePairs.length} incomplete)`)
      return
    }

    setLoading(true)
    try {
      // Step 1: Create minimal pairs structure for hydration
      const minimalPairs = moviePairs.map((pair, index) => ({
        round: index + 1,
        movieA: {
          id: pair.movieA!.id
        },
        movieB: {
          id: pair.movieB!.id
        }
      }))

      console.log('Hydrating pairs with unified structure...')
      
      // Step 2: Hydrate pairs using unified hydration API
      const hydrationResponse = await fetch('/api/admin/puzzles/hydrate-budget-bracket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pairs: minimalPairs
        })
      })

      const hydrationResult = await hydrationResponse.json()
      
      if (!hydrationResponse.ok) {
        console.error("Hydration error:", hydrationResult)
        
        // Handle validation errors with detailed messaging
        if (hydrationResult.validationErrors && hydrationResult.validationErrors.length > 0) {
          const errorMessages = hydrationResult.validationErrors.map((err: any) => {
            if (err.error === 'insufficient_budget') {
              return `${err.message}`
            }
            return err.message
          }).join('\n\n')
          
          const fullMessage = `${hydrationResult.error}\n\n${errorMessages}\n\nPlease replace the invalid movies with ones that have budgets ≥$100.`
          throw new Error(fullMessage)
        }
        
        throw new Error(hydrationResult.error || 'Failed to hydrate movie data')
      }
      
      // Check if hydration succeeded but with warnings (partial validation failures)
      if (hydrationResult.validationErrors && hydrationResult.validationErrors.length > 0) {
        const errorMessages = hydrationResult.validationErrors.map((err: any) => err.message).join('\n\n')
        const warningMessage = `Some movie pairs were dropped due to validation issues:\n\n${errorMessages}\n\nPlease fix these issues before saving the puzzle.`
        
        // Show warning and prevent saving
        alert(warningMessage)
        throw new Error('Cannot save puzzle with validation errors')
      }

      console.log('Movies hydrated successfully:', hydrationResult.stats)

      // Step 3: Generate puzzle metadata
      let puzzleNumber: number
      let seedValue: string
      
      if (isEditMode && puzzleId) {
        // For updates, preserve existing puzzle number and seed value
        const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=budget_bracket`)
        const existingPuzzle = await response.json()
        puzzleNumber = existingPuzzle.puzzle_number
        seedValue = existingPuzzle.seed_value
      } else {
        // For new puzzles, generate new values
        const timestamp = Date.now().toString(36)
        const dateStr = puzzleDate ? puzzleDate.replace(/-/g, '') : `draft${timestamp}`
        seedValue = `bb_${dateStr}_${timestamp}`.substring(0, 32)

        // Get the highest puzzle number and increment
        const { data: latestPuzzle } = await supabase
          .from('budget_bracket_puzzles')
          .select('puzzle_number')
          .order('puzzle_number', { ascending: false })
          .limit(1)
          .single()

        puzzleNumber = (latestPuzzle?.puzzle_number || 0) + 1
      }
      
      // Step 4: Create puzzle data with hydrated pairs
      const puzzleData = {
        puzzle_date: puzzleDate || null,
        seed_value: seedValue,
        pairs: hydrationResult.hydratedPairs, // Use hydrated pairs with unified structure
        difficulty_progression: [1.0, 0.8, 0.6, 0.4, 0.2],
        puzzle_number: puzzleNumber,
        is_published: isPublished
      }

      console.log('Saving puzzle with hydrated data:', {
        ...puzzleData,
        pairs: puzzleData.pairs.map(p => ({
          ...p,
          movieA: { ...p.movieA, keys: Object.keys(p.movieA) },
          movieB: { ...p.movieB, keys: Object.keys(p.movieB) }
        }))
      })

      // Step 5: Save or update the puzzle with unified structure
      const apiUrl = isEditMode && puzzleId 
        ? `/api/admin/puzzles/update`
        : '/api/admin/puzzles/save'
      
      const requestBody = isEditMode && puzzleId
        ? { gameType: 'budget_bracket', puzzleData, puzzleId }
        : { gameType: 'budget_bracket', puzzleData }
      
      const response = await fetch(apiUrl, {
        method: isEditMode && puzzleId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error("API error:", result)
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'save'} puzzle`)
      }
      
      console.log(`Puzzle ${isEditMode ? 'updated' : 'saved'} successfully with unified structure:`, result)
      alert(`Puzzle ${isEditMode ? 'updated' : 'created'} successfully with complete movie data!`)
      
      // Only reset form for new puzzles, not updates
      if (!isEditMode) {
        setPuzzleDate("")
        setMoviePairs(Array(TOTAL_PAIRS).fill(null).map(() => ({ movieA: null, movieB: null })))
        setIsPublished(false)
      }
      
    } catch (error: any) {
      console.error("Error saving puzzle:", error)
      
      if (error?.message) {
        if (error.message.includes('validation errors')) {
          // Validation error messages are already shown in alert above
          // Just log the error for debugging
          console.error("Validation errors prevented puzzle save:", error.message)
        } else if (error.message.includes('minimum budget requirement')) {
          // Show budget validation errors in a more user-friendly way
          alert(error.message)
        } else if (error.message.includes('hydrate')) {
          alert("Failed to fetch complete movie data from TMDB. Please try again.")
        } else if (error.message.includes('puzzle_date')) {
          alert("Cannot save multiple draft puzzles without dates due to database constraints. Please assign a future date to this puzzle.")
        } else if (error.message.includes('seed_value')) {
          alert("A puzzle with this configuration already exists. Please try again.")
        } else {
          alert(error.message)
        }
      } else {
        alert("Failed to save puzzle. Please check the console for details.")
      }
    } finally {
      setLoading(false)
    }
  }

  const getPreviewData = () => {
    return {
      pairs: moviePairs.map((pair, index) => ({
        roundNumber: index + 1,
        movieA: pair.movieA ? {
          title: pair.movieA.title,
          poster_path: pair.movieA.poster_path,
          budget: pair.movieA.budget
        } : null,
        movieB: pair.movieB ? {
          title: pair.movieB.title,
          poster_path: pair.movieB.poster_path,
          budget: pair.movieB.budget
        } : null
      }))
    }
  }

  // Show loading state while puzzle data is being loaded
  if (loadingPuzzle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading puzzle data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {isEditMode ? "Edit Budget Bracket Puzzle" : "Create Budget Bracket Puzzle"}
        </h2>
        <p className="text-sm text-gray-600">
          Players guess which movie has the higher budget across 5 rounds
        </p>
      </div>

      {/* Date and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="puzzle-date">Puzzle Date</Label>
          <Input
            id="puzzle-date"
            type="date"
            value={puzzleDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="is-published">Status</Label>
          <div className="flex items-center gap-3 h-10 px-3 rounded-lg bg-gray-50 border border-gray-200">
            <Switch
              id="is-published"
              checked={isPublished}
              onCheckedChange={handlePublishedChange}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
            />
            <Label htmlFor="is-published" className="font-normal cursor-pointer select-none">
              <span className={cn(
                "font-medium",
                isPublished ? "text-green-700" : "text-gray-600"
              )}>
                {isPublished ? "Published" : "Draft"}
              </span>
            </Label>
          </div>
        </div>
      </div>

      {/* Movie Pairs with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Movie Pairs</h3>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={autoFillPairs}
                disabled={autoFilling || moviePairs.every(p => p.movieA && p.movieB)}
                className="flex items-center gap-1.5 text-xs"
                title="Auto-fill empty slots with similar movies"
              >
                {autoFilling ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Auto-Fill
              </Button>
              <Badge variant="outline">
                {moviePairs.filter(p => p.movieA && p.movieB).length}/{TOTAL_PAIRS} Complete
              </Badge>
              <p className="text-xs text-gray-500">
                Drag rounds or individual movies to reorder
              </p>
            </div>
          </div>

          <SortableContext
            items={moviePairs.map((_, idx) => `round-${idx}`).concat(
              moviePairs.flatMap((pair, idx) => [
                pair.movieA ? `movie-${idx}-A` : null,
                pair.movieB ? `movie-${idx}-B` : null
              ]).filter(Boolean) as string[]
            )}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {moviePairs.map((pair, pairIdx) => (
                <DraggableRound
                  key={`round-${pairIdx}`}
                  pairIndex={pairIdx}
                  pair={pair}
                  onOpenMovieSelector={openMovieSelector}
                  onRemoveMovie={removeMovie}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {getDragOverlay()}
        </DragOverlay>
      </DndContext>

      {/* Save Button */}
      <Button
        className="w-full"
        onClick={savePuzzle}
        disabled={loading || moviePairs.some(p => !p.movieA || !p.movieB)}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? "Update Puzzle" : "Save Puzzle"}
          </>
        )}
      </Button>

      {/* Movie Selector Modal */}
      {showMovieSelector && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMovieSelector(false)
              setSelectedPosition(null)
            }
          }}
        >
          <Card className="admin-modal-silver w-full max-w-2xl h-[80vh] flex flex-col relative" style={{ borderRadius: 0 }}>
            <button
              onClick={() => {
                setShowMovieSelector(false)
                setSelectedPosition(null)
              }}
              className="admin-modal-ghost-close absolute right-4 top-4 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 pr-12 flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-4 font-funnel-display-bold text-neutral-900">Select Movie</h3>
              <MovieSelector
                onSelect={handleSelectMovie}
                onClose={() => {
                  setShowMovieSelector(false)
                  setSelectedPosition(null)
                }}
                excludeIds={getUsedMovieIds()}
                showBudget={true}
              />
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  )
}