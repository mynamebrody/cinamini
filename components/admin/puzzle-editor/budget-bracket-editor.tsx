"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Save, Loader2, Plus, X, Film, GripVertical, Sparkles } from "lucide-react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import MovieSelector from "../shared/movie-selector"
import SmartGenerationDialog from "../shared/smart-generation-dialog"
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
  DragOverlay,
  useDroppable
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
          <Image
            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
            alt={movie.title}
            width={48}
            height={72}
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

// Droppable Empty Slot component
function DroppableEmptySlot({ 
  pairIndex, 
  slot, 
  onOpenMovieSelector,
  dragOverMovie 
}: {
  pairIndex: number
  slot: "A" | "B"
  onOpenMovieSelector: (pairIndex: number, slot: "A" | "B") => void
  dragOverMovie?: string | null
}) {
  const dropId = `empty-${pairIndex}-${slot}`
  const { setNodeRef, isOver } = useDroppable({ id: dropId })
  
  return (
    <div ref={setNodeRef}>
      <button
        onClick={() => onOpenMovieSelector(pairIndex, slot)}
        className={cn(
          "w-full h-[82px] bg-gray-100 rounded-lg border-2 border-dashed border-[rgb(var(--silver))] hover:border-gray-400 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-gray-700",
          isOver && "border-cinema-red bg-cinema-red/10",
          dragOverMovie === dropId && "border-cinema-red bg-cinema-red/10"
        )}
      >
        <Plus className="w-5 h-5 mb-0.5" />
        <span className="text-xs">{isOver ? "Drop Movie" : "Add Movie"}</span>
      </button>
    </div>
  )
}

// Draggable MovieCard component
function DraggableMovieCard({ movie, dragId, onRemove, recentlyUsedMoviesMap, budgetStatus }: { 
  movie: Movie, 
  dragId: string, 
  onRemove: () => void,
  recentlyUsedMoviesMap?: Map<number, {date: string, isFuture: boolean}>,
  budgetStatus?: 'winner' | 'loser' | null
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
        "bg-white rounded-lg p-2 h-full transition-all duration-200",
        isDragging ? "shadow-lg border-cinema-red border-2" : "hover:shadow-md",
        budgetStatus === 'winner' ? "border-2 border-green-500" : 
        budgetStatus === 'loser' ? "border-2 border-red-500" :
        "border border-gray-200"
      )}>
        <div className="flex gap-2">
          {movie.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
              alt={movie.title}
              width={48}
              height={72}
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
      
      {/* Recently used/scheduled badge */}
      {recentlyUsedMoviesMap?.has(movie.id) && (
        <div 
          className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold rounded shadow-sm z-10"
          style={{
            backgroundColor: recentlyUsedMoviesMap.get(movie.id)?.isFuture ? '#fbbf24' : '#ef4444',
            color: 'white'
          }}
          title={`${recentlyUsedMoviesMap.get(movie.id)?.isFuture ? 'Scheduled for' : 'Used on'} ${recentlyUsedMoviesMap.get(movie.id)?.date}`}
        >
          {recentlyUsedMoviesMap.get(movie.id)?.isFuture ? 'Scheduled' : 'Used'}
        </div>
      )}
      
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
  isDragDisabled = false,
  recentlyUsedMoviesMap,
  dragOverMovie
}: {
  pairIndex: number
  pair: MoviePair
  onOpenMovieSelector: (pairIndex: number, slot: "A" | "B") => void
  onRemoveMovie: (pairIndex: number, slot: "A" | "B") => void
  isDragDisabled?: boolean
  recentlyUsedMoviesMap?: Map<number, {date: string, isFuture: boolean}>
  dragOverMovie?: string | null
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

  // Calculate budget comparison for visual indicators
  const getBudgetComparison = () => {
    if (!pair.movieA || !pair.movieB || !pair.movieA.budget || !pair.movieB.budget) {
      return { movieAStatus: null, movieBStatus: null, budgetDifference: null }
    }

    const budgetA = pair.movieA.budget
    const budgetB = pair.movieB.budget
    
    if (budgetA > budgetB) {
      return {
        movieAStatus: 'winner' as const,
        movieBStatus: 'loser' as const,
        budgetDifference: budgetA - budgetB
      }
    } else if (budgetB > budgetA) {
      return {
        movieAStatus: 'loser' as const,
        movieBStatus: 'winner' as const,
        budgetDifference: budgetB - budgetA
      }
    } else {
      return { movieAStatus: null, movieBStatus: null, budgetDifference: 0 }
    }
  }

  const { movieAStatus, movieBStatus, budgetDifference } = getBudgetComparison()

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
                recentlyUsedMoviesMap={recentlyUsedMoviesMap}
                budgetStatus={movieAStatus}
              />
            ) : (
              <DroppableEmptySlot 
                pairIndex={pairIndex}
                slot="A"
                onOpenMovieSelector={onOpenMovieSelector}
                dragOverMovie={dragOverMovie}
              />
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
                recentlyUsedMoviesMap={recentlyUsedMoviesMap}
                budgetStatus={movieBStatus}
              />
            ) : (
              <DroppableEmptySlot 
                pairIndex={pairIndex}
                slot="B"
                onOpenMovieSelector={onOpenMovieSelector}
                dragOverMovie={dragOverMovie}
              />
            )}
          </div>
          
          {/* Budget Difference Display */}
          {budgetDifference !== null && budgetDifference > 0 && (
            <div className="flex-shrink-0 ml-4 text-xs">
              <div className="bg-gray-50 border border-gray-200 rounded p-2 min-w-[140px]">
                <div className="text-gray-600 font-medium mb-1">Budget Difference:</div>
                <div className="font-mono text-sm">
                  ${Math.max(pair.movieA?.budget || 0, pair.movieB?.budget || 0).toLocaleString()}
                </div>
                <div className="text-gray-500">minus</div>
                <div className="font-mono text-sm">
                  ${Math.min(pair.movieA?.budget || 0, pair.movieB?.budget || 0).toLocaleString()}
                </div>
                <hr className="my-1 border-gray-300" />
                <div className="font-bold text-green-600">
                  = ${budgetDifference.toLocaleString()}
                </div>
              </div>
            </div>
          )}
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
  const [puzzleName, setPuzzleName] = useState("")
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
  const [loadedPuzzleData, setLoadedPuzzleData] = useState<any>(null)

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragOverMovie, setDragOverMovie] = useState<string | null>(null)

  // Auto-fill state
  const [cachedMovies, setCachedMovies] = useState<Movie[]>([])
  const [recentlyUsedMovies, setRecentlyUsedMovies] = useState<Set<number>>(new Set())
  const [recentlyUsedMoviesMap, setRecentlyUsedMoviesMap] = useState<Map<number, {date: string, isFuture: boolean}>>(new Map())
  const [autoFilling, setAutoFilling] = useState(false)
  const [cachedMoviesLoaded, setCachedMoviesLoaded] = useState(false)
  const [cachedMoviesLoading, setCachedMoviesLoading] = useState(false)

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

  const loadPuzzleData = useCallback(async (puzzleId: string) => {
    setLoadingPuzzle(true)
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=budget_bracket`)
      
      if (!response.ok) {
        throw new Error('Failed to load puzzle data')
      }
      
      const response_data = await response.json()
      
      // Extract puzzle data from the response
      const puzzleData = response_data.puzzle
      
      // Store the loaded puzzle data for reuse
      setLoadedPuzzleData(puzzleData)
      
      // Set edit mode
      setIsEditMode(true)
      
      // Load puzzle fields
      setPuzzleDate(puzzleData.puzzle_date || "")
      setPuzzleName(puzzleData.name || "")
      setIsPublished(!!puzzleData.puzzle_date) // Published if it has a date
      
      // Parse and load movie pairs - Budget Bracket uses 'pairs' field (renamed from movie_pairs)
      const pairsData = puzzleData.pairs || puzzleData.movie_pairs // Support both for backwards compatibility
      let loadedPairs = []
      
      if (pairsData && Array.isArray(pairsData)) {
        loadedPairs = pairsData.map((pair: any) => ({
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
      }
      
      // Ensure we have exactly 5 pairs (create empty pairs if data is missing)
      while (loadedPairs.length < TOTAL_PAIRS) {
        loadedPairs.push({ movieA: null, movieB: null })
      }
      
      // Always set the movie pairs, even if database had no data
      setMoviePairs(loadedPairs)
      
    } catch (error: any) {
      console.error('Error loading puzzle:', error)
      alert('Failed to load puzzle data. Please try again.')
    } finally {
      setLoadingPuzzle(false)
    }
  }, [])

  // Load existing puzzle data if puzzleId is provided
  useEffect(() => {
    if (puzzleId) {
      loadPuzzleData(puzzleId)
    }
  }, [puzzleId, loadPuzzleData])

  const fetchRecentlyUsedMovies = useCallback(async (excludePuzzleId?: string) => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const pastDateStr = thirtyDaysAgo.toISOString().split('T')[0]
      
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      const usedMovieIds = new Set<number>()
      const movieDateMap = new Map<number, {date: string, isFuture: boolean}>()

      // Check retitled puzzles (past 30 days)
      const retitledPastQuery = supabase
        .from('retitled_puzzles')
        .select('id, film_id, puzzle_date')
        .gte('puzzle_date', pastDateStr)
        .lte('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Note: excludePuzzleId only applies to budget bracket puzzles in this editor

      const { data: retitledPastData } = await retitledPastQuery

      if (retitledPastData) {
        retitledPastData.forEach(puzzle => {
          usedMovieIds.add(puzzle.film_id)
          movieDateMap.set(puzzle.film_id, { date: puzzle.puzzle_date, isFuture: false })
        })
      }

      // Check retitled puzzles (future scheduled)
      const retitledFutureQuery = supabase
        .from('retitled_puzzles')
        .select('id, film_id, puzzle_date')
        .gt('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Note: excludePuzzleId only applies to budget bracket puzzles in this editor

      const { data: retitledFutureData } = await retitledFutureQuery

      if (retitledFutureData) {
        retitledFutureData.forEach(puzzle => {
          usedMovieIds.add(puzzle.film_id)
          movieDateMap.set(puzzle.film_id, { date: puzzle.puzzle_date, isFuture: true })
        })
      }

      // Check cast climb puzzles (past 30 days)
      const castClimbPastQuery = supabase
        .from('cast_climb_puzzles')
        .select('id, film_id, puzzle_date')
        .gte('puzzle_date', pastDateStr)
        .lte('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Note: excludePuzzleId only applies to budget bracket puzzles in this editor

      const { data: castClimbPastData } = await castClimbPastQuery

      if (castClimbPastData) {
        castClimbPastData.forEach(puzzle => {
          usedMovieIds.add(puzzle.film_id)
          movieDateMap.set(puzzle.film_id, { date: puzzle.puzzle_date, isFuture: false })
        })
      }

      // Check cast climb puzzles (future scheduled)
      const castClimbFutureQuery = supabase
        .from('cast_climb_puzzles')
        .select('id, film_id, puzzle_date')
        .gt('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Note: excludePuzzleId only applies to budget bracket puzzles in this editor

      const { data: castClimbFutureData } = await castClimbFutureQuery

      if (castClimbFutureData) {
        castClimbFutureData.forEach(puzzle => {
          usedMovieIds.add(puzzle.film_id)
          movieDateMap.set(puzzle.film_id, { date: puzzle.puzzle_date, isFuture: true })
        })
      }

      // Check budget bracket puzzles (past 30 days)
      const budgetBracketPastQuery = supabase
        .from('budget_bracket_puzzles')
        .select('id, movie_pairs, puzzle_date')
        .gte('puzzle_date', pastDateStr)
        .lte('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Exclude current puzzle if editing
      if (excludePuzzleId) {
        budgetBracketPastQuery.neq('id', excludePuzzleId)
      }

      const { data: budgetBracketPastData } = await budgetBracketPastQuery

      if (budgetBracketPastData) {
        budgetBracketPastData.forEach(puzzle => {
          // Parse pairs to extract movie IDs
          if (puzzle.movie_pairs && Array.isArray(puzzle.movie_pairs)) {
            puzzle.movie_pairs.forEach((pair: any) => {
              if (pair.movieA && pair.movieA.id) {
                usedMovieIds.add(pair.movieA.id)
                movieDateMap.set(pair.movieA.id, { date: puzzle.puzzle_date, isFuture: false })
              }
              if (pair.movieB && pair.movieB.id) {
                usedMovieIds.add(pair.movieB.id)
                movieDateMap.set(pair.movieB.id, { date: puzzle.puzzle_date, isFuture: false })
              }
            })
          }
        })
      }

      // Check budget bracket puzzles (future scheduled)
      const budgetBracketFutureQuery = supabase
        .from('budget_bracket_puzzles')
        .select('id, movie_pairs, puzzle_date')
        .gt('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Exclude current puzzle if editing
      if (excludePuzzleId) {
        budgetBracketFutureQuery.neq('id', excludePuzzleId)
      }

      const { data: budgetBracketFutureData } = await budgetBracketFutureQuery

      if (budgetBracketFutureData) {
        budgetBracketFutureData.forEach(puzzle => {
          // Parse pairs to extract movie IDs
          if (puzzle.movie_pairs && Array.isArray(puzzle.movie_pairs)) {
            puzzle.movie_pairs.forEach((pair: any) => {
              if (pair.movieA && pair.movieA.id) {
                usedMovieIds.add(pair.movieA.id)
                movieDateMap.set(pair.movieA.id, { date: puzzle.puzzle_date, isFuture: true })
              }
              if (pair.movieB && pair.movieB.id) {
                usedMovieIds.add(pair.movieB.id)
                movieDateMap.set(pair.movieB.id, { date: puzzle.puzzle_date, isFuture: true })
              }
            })
          }
        })
      }

      // Check poster pixels puzzles (past 30 days)
      const posterPixelsPastQuery = supabase
        .from('poster_pixels_puzzles')
        .select('id, film_id, puzzle_date')
        .gte('puzzle_date', pastDateStr)
        .lte('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Note: excludePuzzleId only applies to budget bracket puzzles in this editor

      const { data: posterPixelsPastData } = await posterPixelsPastQuery

      if (posterPixelsPastData) {
        posterPixelsPastData.forEach(puzzle => {
          usedMovieIds.add(puzzle.film_id)
          movieDateMap.set(puzzle.film_id, { date: puzzle.puzzle_date, isFuture: false })
        })
      }

      // Check poster pixels puzzles (future scheduled)
      const posterPixelsFutureQuery = supabase
        .from('poster_pixels_puzzles')
        .select('id, film_id, puzzle_date')
        .gt('puzzle_date', todayStr)
        .not('puzzle_date', 'is', null)
      
      // Note: excludePuzzleId only applies to budget bracket puzzles in this editor

      const { data: posterPixelsFutureData } = await posterPixelsFutureQuery

      if (posterPixelsFutureData) {
        posterPixelsFutureData.forEach(puzzle => {
          usedMovieIds.add(puzzle.film_id)
          movieDateMap.set(puzzle.film_id, { date: puzzle.puzzle_date, isFuture: true })
        })
      }

      // Store the results
      setRecentlyUsedMovies(usedMovieIds)
      setRecentlyUsedMoviesMap(movieDateMap)

    } catch (error) {
      console.error('Error fetching recently used movies:', error)
    }
  }, [supabase])

  // Load recently used movies on component mount
  useEffect(() => {
    fetchRecentlyUsedMovies(puzzleId || undefined)
  }, [puzzleId, fetchRecentlyUsedMovies])


  const fetchCachedMovies = async () => {
    if (cachedMoviesLoaded || cachedMoviesLoading) return

    setCachedMoviesLoading(true)
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

    } catch (error) {
      console.error('Error fetching cached movies:', error)
    } finally {
      setCachedMoviesLoading(false)
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
    
    const allMovies: Movie[] = []
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url)
        
        if (response.ok) {
          const data = await response.json()
          const movies = data.results || []
          
          if (movies.length > 0) {
            allMovies.push(...movies)
            
            // Stop if we have enough movies (let's aim for at least 20 total)
            if (allMovies.length >= 20) {
              break
            }
          }
        } else {
        }
      } catch {
      }
    }
    
    // Remove duplicates based on movie ID
    const uniqueMovies = allMovies.filter((movie, index, arr) => 
      arr.findIndex(m => m.id === movie.id) === index
    )
    
    return uniqueMovies
  }

  // Helper function to create optimal budget pairs from sorted movies
  const createOptimalBudgetPairs = (sortedMovies: Movie[]): Array<{movieA: Movie, movieB: Movie}> => {
    const pairs = []
    const used = new Set<number>()
    
    
    // Strategy: Pair movies with similar budgets, allowing some variance for interest
    for (let i = 0; i < sortedMovies.length - 1; i++) {
      if (used.has(i)) continue
      
      const baseBudget = sortedMovies[i].budget || 0
      let bestPartnerIdx = -1
      let bestDifference = Infinity
      
      // Look ahead for movies within reasonable budget range (up to 5 positions)
      for (let j = i + 1; j < Math.min(i + 6, sortedMovies.length); j++) {
        if (used.has(j)) continue
        
        const candidateBudget = sortedMovies[j].budget || 0
        const difference = Math.abs(candidateBudget - baseBudget)
        const percentDifference = baseBudget > 0 ? (difference / baseBudget) : 1
        
        // Skip movies with identical budgets - there must be a difference
        if (difference === 0) continue
        
        // Prefer movies with smaller budget differences
        // But allow up to 50% difference to ensure we can make pairs
        if (percentDifference <= 0.5 && difference < bestDifference) {
          bestDifference = difference
          bestPartnerIdx = j
        }
      }
      
      // If no good match found within range, take the next available movie (but not same budget)
      if (bestPartnerIdx === -1) {
        for (let j = i + 1; j < sortedMovies.length; j++) {
          if (!used.has(j)) {
            const candidateBudget = sortedMovies[j].budget || 0
            const difference = Math.abs(candidateBudget - baseBudget)
            // Only accept if budgets are different
            if (difference > 0) {
              bestPartnerIdx = j
              break
            }
          }
        }
      }
      
      if (bestPartnerIdx !== -1 && !used.has(bestPartnerIdx)) {
        const movieA = sortedMovies[i]
        const movieB = sortedMovies[bestPartnerIdx]
        
        pairs.push({ movieA, movieB })
        used.add(i)
        used.add(bestPartnerIdx)
        
      }
    }
    
    return pairs
  }

  // Helper function to find best budget match for a single movie
  const findBestBudgetMatch = (targetMovie: Movie, availableMovies: Movie[], usedIds: Set<number>): Movie | null => {
    const targetBudget = targetMovie.budget || 0
    let bestMatch = null
    let bestDifference = Infinity
    
    for (const candidate of availableMovies) {
      // Skip if already used
      if (usedIds.has(candidate.id)) continue
      
      const candidateBudget = candidate.budget || 0
      const difference = Math.abs(candidateBudget - targetBudget)
      
      if (difference < bestDifference) {
        bestDifference = difference
        bestMatch = candidate
      }
    }
    
    if (bestMatch) {
      // Best match found based on budget similarity
    }
    
    return bestMatch
  }

  const autoFillPairs = async () => {
    setAutoFilling(true)
    
    try {
      // Get currently used movie IDs
      const usedIds = getUsedMovieIds()
      
      // Count empty slots
      let emptySlots = 0
      moviePairs.forEach(pair => {
        if (!pair.movieA) emptySlots++
        if (!pair.movieB) emptySlots++
      })
      
      if (emptySlots === 0) {
        return
      }

      let availableMovies: Movie[] = []

      // Check if we have any movies selected already
      const hasSelectedMovies = usedIds.length > 0
      
      if (hasSelectedMovies) {
        // Use cascading movie discovery: similar → recommendations → trending
        const firstMovieId = usedIds[0]
        
        availableMovies = await fetchMoviesWithFallback(firstMovieId)
      } else {
        // Start with 0 selected movies: pick random from popular, then get similar movies
        
        // Ensure cached movies are loaded
        await fetchCachedMovies()
        
        if (cachedMovies.length === 0) {
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
        
        
        // IMMEDIATELY place the base movie in the first empty slot for visual feedback
        const newPairs = [...moviePairs]
        const firstEmptyPairIndex = newPairs.findIndex(pair => !pair.movieA || !pair.movieB)
        if (firstEmptyPairIndex !== -1) {
          if (!newPairs[firstEmptyPairIndex].movieA) {
            newPairs[firstEmptyPairIndex].movieA = baseMovie
          } else if (!newPairs[firstEmptyPairIndex].movieB) {
            newPairs[firstEmptyPairIndex].movieB = baseMovie
          }
          setMoviePairs(newPairs)
        }
        
        try {
          availableMovies = await fetchMoviesWithFallback(baseMovie.id)
          // Include the base movie as first option (for consistency with existing logic)
          availableMovies.unshift(baseMovie)
        } catch {
          availableMovies = [baseMovie, ...cachedMovies]
        }
      }

      // Recalculate used IDs after potential pre-filling
      const currentlyUsedIds = getUsedMovieIds()
      
      // Add debugging to see what we have
      
      // Filter out recently used and already selected movies
      let filteredMovies = availableMovies.filter(movie => {
        const notRecentlyUsed = !recentlyUsedMovies.has(movie.id)
        const notCurrentlyUsed = !currentlyUsedIds.includes(movie.id)
        const hasBudget = movie.budget && typeof movie.budget === 'number' && movie.budget >= 100
        
        if (!notRecentlyUsed) {
        }
        if (!notCurrentlyUsed) {
        }
        if (!hasBudget) {
        }
        
        return notRecentlyUsed && notCurrentlyUsed && hasBudget
      })
      
      
      // If no movies pass the strict filter, try a more lenient approach
      if (filteredMovies.length === 0) {
        
        // Try without budget requirement first (we can fetch details later)
        filteredMovies = availableMovies.filter(movie => {
          return !recentlyUsedMovies.has(movie.id) && 
                 !currentlyUsedIds.includes(movie.id)
        })
        
        
        if (filteredMovies.length === 0) {
          alert('No suitable movies found. The similar movies API may have returned movies that are recently used or already selected.')
          return
        }
        
        // Take first few movies and fetch their details to check budgets
        const moviesToCheck = filteredMovies.slice(0, 15) // Check more movies to increase chances
        
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
          } catch {
          }
        }
        
        filteredMovies = moviesWithBudgets
      }

      if (filteredMovies.length === 0) {
        alert('No suitable movies found with budgets ≥ $100. Try manually selecting movies or wait for the cached movie list to update.')
        return
      }

      // Sort movies by budget for optimal pairing
      const sortedMovies = filteredMovies.sort((a, b) => (a.budget || 0) - (b.budget || 0))

      // Create optimal budget pairs from available movies
      const optimalPairs = createOptimalBudgetPairs(sortedMovies)

      // Get current state of pairs (which may include pre-filled movie from empty state)
      const currentPairs = [...moviePairs]
      let pairIndex = 0

      // First, fill completely empty slots with pre-paired movies
      for (let pairIdx = 0; pairIdx < currentPairs.length && pairIndex < optimalPairs.length; pairIdx++) {
        const pair = currentPairs[pairIdx]
        
        // Only use optimal pairs for completely empty slots (both movies missing)
        if (!pair.movieA && !pair.movieB) {
          const optimalPair = optimalPairs[pairIndex]
          pair.movieA = optimalPair.movieA
          pair.movieB = optimalPair.movieB
          pairIndex++
        }
      }

      // Then fill remaining single empty slots with best budget matches
      const usedMovieIds = new Set<number>()
      currentPairs.forEach(pair => {
        if (pair.movieA) usedMovieIds.add(pair.movieA.id)
        if (pair.movieB) usedMovieIds.add(pair.movieB.id)
      })

      for (let pairIdx = 0; pairIdx < currentPairs.length; pairIdx++) {
        const pair = currentPairs[pairIdx]
        
        // Fill single empty slots (movieA exists but movieB is missing, or vice versa)
        if (pair.movieA && !pair.movieB) {
          const bestMatch = findBestBudgetMatch(pair.movieA, sortedMovies, usedMovieIds)
          if (bestMatch) {
            pair.movieB = bestMatch
            usedMovieIds.add(bestMatch.id)
          }
        } else if (!pair.movieA && pair.movieB) {
          const bestMatch = findBestBudgetMatch(pair.movieB, sortedMovies, usedMovieIds)
          if (bestMatch) {
            pair.movieA = bestMatch
            usedMovieIds.add(bestMatch.id)
          }
        }
      }

      setMoviePairs(currentPairs)
      

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

    // Handle dropping movie onto empty slot (movie-0-A to empty-1-B)
    if (activeId.startsWith('movie-') && overId.startsWith('empty-')) {
      const [, activePairIdx, activeSlot] = activeId.split('-')
      const [, overPairIdx, overSlot] = overId.split('-')

      const activePairIndex = parseInt(activePairIdx)
      const overPairIndex = parseInt(overPairIdx)
      const activeMovieSlot = activeSlot as 'A' | 'B'
      const overMovieSlot = overSlot as 'A' | 'B'

      setMoviePairs(prev => {
        const newPairs = [...prev]
        const activeMovie = newPairs[activePairIndex][`movie${activeMovieSlot}`]

        // Move the movie from active slot to empty slot
        newPairs[activePairIndex] = {
          ...newPairs[activePairIndex],
          [`movie${activeMovieSlot}`]: null
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

  const handleSmartGeneration = async (puzzleData: any) => {
    // Handle smart-generated puzzle data
    if (puzzleData.pairs) {
      // Full puzzle generated - populate all fields
      if (puzzleData.puzzle_date) {
        setPuzzleDate(puzzleData.puzzle_date)
      }
      
      // Load the movie pairs
      const newRounds = puzzleData.pairs.map((pair: any[], index: number) => ({
        round: index + 1,
        pair: pair.map(movie => ({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          budget: movie.budget
        }))
      }))
      
      setRounds(newRounds)
    }
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


      // Step 3: Generate puzzle metadata
      let seedValue: string
      
      if (isEditMode && puzzleId) {
        // For updates, preserve existing seed value
        // Use cached puzzle data if available, otherwise fetch
        let existingPuzzle = loadedPuzzleData
        if (!existingPuzzle) {
          const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=budget_bracket`)
          const responseData = await response.json()
          existingPuzzle = responseData.puzzle
        }
        seedValue = existingPuzzle.seed_value
      } else {
        // For new puzzles, generate new values
        const timestamp = Date.now().toString(36)
        const dateStr = puzzleDate ? puzzleDate.replace(/-/g, '') : `draft${timestamp}`
        seedValue = `bb_${dateStr}_${timestamp}`.substring(0, 32)
      }
      
      // Step 4: Create puzzle data with hydrated pairs
      const puzzleData = {
        puzzle_date: puzzleDate || null,
        name: puzzleName.trim() || null, // Include optional name
        seed_value: seedValue,
        pairs: hydrationResult.hydratedPairs, // Use hydrated pairs with unified structure - column renamed from movie_pairs to pairs
        difficulty_progression: [1.0, 0.8, 0.6, 0.4, 0.2],
        is_published: isPublished
      }


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
      
      alert(`Puzzle ${isEditMode ? 'updated' : 'created'} successfully with complete movie data!`)
      
      // Only reset form for new puzzles, not updates
      if (!isEditMode) {
        setPuzzleDate("")
        setPuzzleName("")
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

      {/* Date, Name, and Status */}
      <div className="grid grid-cols-3 gap-4">
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
          <Label htmlFor="puzzle-name">Puzzle Name (Optional)</Label>
          <Input
            id="puzzle-name"
            type="text"
            placeholder="e.g., 'Blockbuster Battle'"
            value={puzzleName}
            onChange={(e) => setPuzzleName(e.target.value)}
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
              {rounds.length === 0 && puzzleDate && (
                <SmartGenerationDialog
                  gameType="budget-bracket"
                  targetDate={puzzleDate}
                  onGenerate={handleSmartGeneration}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={autoFillPairs}
                disabled={autoFilling}
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
                pair.movieA ? `movie-${idx}-A` : `empty-${idx}-A`,
                pair.movieB ? `movie-${idx}-B` : `empty-${idx}-B`
              ])
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
                  recentlyUsedMoviesMap={recentlyUsedMoviesMap}
                  dragOverMovie={dragOverMovie}
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