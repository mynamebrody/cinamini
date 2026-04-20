"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { 
  Save, 
  Loader2, 
  X, 
  Film, 
  Users, 
  GripVertical,
  Info,
  Sparkles,
  ExternalLink,
  StopCircle
} from "lucide-react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import MovieSelector from "../shared/movie-selector"
import MovieDetailsCard from "../shared/movie-details-card"
import PuzzlePreview from "../shared/puzzle-preview"
import SmartGenerationDialog from "../shared/smart-generation-dialog"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { streamFunFacts, isAbortError, type FunFact } from "@/lib/admin/fun-facts-stream"
import {
  streamSmartGeneration,
  isAbortError as isSmartGenAbortError,
} from "@/lib/admin/smart-gen-stream"
import AutoSmartGenBanner, {
  type AutoSmartGenActivityEntry,
  type AutoSmartGenState,
} from "../shared/auto-smart-gen-banner"

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

interface Actor {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}


interface CastCredits {
  cast: Actor[]
  crew: any[]
}

function SortableActor({ actor, index }: { actor: Actor; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: actor.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-white rounded-lg border transition-all",
        isDragging ? "opacity-50 border-blue-300 shadow-lg" : "border-gray-200"
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className="flex items-center gap-3 flex-1">
        {actor.profile_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
            alt={actor.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{actor.name}</p>
          <p className="text-xs text-gray-500 truncate">as {actor.character}</p>
        </div>
        
        <Badge variant="outline" className="text-xs">
          Hint {index + 1}
        </Badge>
      </div>
    </div>
  )
}

interface CastClimbEditorProps {
  prefilledDate?: string | null
  prefilledMovieId?: string | null
  onDateChange?: (date: string | null) => void
  onMovieChange?: (movieId: string | null) => void
  puzzleId?: string | null
  /**
   * Whether this editor is currently the active tab. Drives eager-vs-lazy
   * auto-smart-generation when `prefilledMovieId` is provided via URL — only
   * the active tab runs immediately, other tabs wait for the first switch.
   */
  isActiveTab?: boolean
}

export default function CastClimbEditor({ prefilledDate, prefilledMovieId, onDateChange, onMovieChange, puzzleId, isActiveTab = false }: CastClimbEditorProps) {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [actors, setActors] = useState<Actor[]>([])
  const [funFact, setFunFact] = useState("")
  const [funFacts, setFunFacts] = useState<Array<FunFact>>([])
  const [funFactIndex, setFunFactIndex] = useState(0)
  const [isGeneratingFact, setIsGeneratingFact] = useState(false)
  const funFactsAbortRef = useRef<AbortController | null>(null)
  const [difficultyLevel, setDifficultyLevel] = useState(1)
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingCast, setLoadingCast] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [fullCast, setFullCast] = useState<Actor[]>([])
  const [showCastSelector, setShowCastSelector] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)

  // Auto smart-gen-on-movieId state. Fires exactly once per
  // (gameType, movieId) pair when the editor becomes the active tab and a
  // `prefilledMovieId` is present (see runAutoSmartGen below).
  const [autoRunState, setAutoRunState] = useState<AutoSmartGenState>('idle')
  const [autoRunActivity, setAutoRunActivity] = useState<AutoSmartGenActivityEntry[]>([])
  const [autoRunError, setAutoRunError] = useState<string | null>(null)
  const [autoRunErrorDetail, setAutoRunErrorDetail] = useState<string | null>(null)
  const autoRunAbortRef = useRef<AbortController | null>(null)
  const autoRunKeyRef = useRef<string | null>(null)
  const autoRunActivityIdRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMovieSelector) setShowMovieSelector(false)
        if (showCastSelector) setShowCastSelector(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showMovieSelector, showCastSelector])

  const fetchAndSelectMovie = useCallback(async (movieId: string) => {
    try {
      const response = await fetch(`/api/movies/${movieId}/details`)
      if (response.ok) {
        const movieData = await response.json()
        
        const movie: Movie = {
          id: movieData.id,
          title: movieData.title,
          poster_path: movieData.poster_path,
          release_date: movieData.release_date || '',
          budget: movieData.budget,
          revenue: movieData.revenue,
          runtime: movieData.runtime,
          director: movieData.credits?.crew?.find((c: any) => c.job === "Director")?.name,
          writer: movieData.credits?.crew?.find((c: any) => c.job === "Screenplay" || c.job === "Writer")?.name,
          vote_average: movieData.vote_average
        }
        
        setSelectedMovie(movie)
        // Automatically fetch cast when movie is selected
        if (movie.id) {
          fetchMovieCast(movie.id)
        }
      }
    } catch (error) {
      console.error('Error fetching movie details:', error)
    }
  }, [])

  // Handle prefilled values from URL parameters
  useEffect(() => {
    if (prefilledDate && !isEditMode) {
      setPuzzleDate(prefilledDate)
      setIsPublished(true) // Auto-publish when date is set
    }
    if (prefilledMovieId && !isEditMode) {
      fetchAndSelectMovie(prefilledMovieId)
    }
  }, [prefilledDate, prefilledMovieId, isEditMode, fetchAndSelectMovie])

  const loadPuzzleData = useCallback(async (puzzleId: string) => {
    setLoadingPuzzle(true)
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=cast_climb`)
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText)
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
      setDifficultyLevel(puzzleData.difficulty_level || 1)
      setFunFact(puzzleData.fun_fact || "")
      
      // Load movie data
      if (puzzleData.film_id) {
        const movie: Movie = {
          id: puzzleData.film_id,
          title: puzzleData.film_title,
          poster_path: puzzleData.film_poster_url,
          release_date: `${puzzleData.film_release_year}-01-01`,
          budget: 0,
          revenue: 0,
          runtime: 0,
          vote_average: 0
        }
        setSelectedMovie(movie)
        // Fetch full cast for the "Change Actor Selection" modal but don't auto-select actors since we're loading from existing puzzle
        fetchMovieCast(puzzleData.film_id, false)
      }
      
      // Load actors data
      if (puzzleData.actors && Array.isArray(puzzleData.actors)) {
        const loadedActors = puzzleData.actors.map((actor: any, index: number) => ({
          // Ensure unique ID by using actor.id or generating one based on index
          id: actor.id || `loaded-actor-${index}-${Date.now()}`,
          name: actor.name,
          character: actor.character,
          profile_path: actor.profile_path,
          order: index
        }))
        setActors(loadedActors)
      } else {
      }
      
    } catch (error) {
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

  const fetchMovieCast = async (movieId: number, autoSelectActors = true) => {
    setLoadingCast(true)
    try {
      const response = await fetch(`/api/movies/${movieId}/credits`)
      if (response.ok) {
        const data: CastCredits = await response.json()
        // Get all cast members sorted by order (lead actors first in TMDB)
        const allCast = (data.cast || [])
          .sort((a: any, b: any) => a.order - b.order)
          .map((actor: any) => ({
            id: actor.id,
            name: actor.name,
            character: actor.character,
            profile_path: actor.profile_path,
            order: actor.order
          }))
        
        setFullCast(allCast)
        // Only auto-select actors when not in edit mode (for new puzzles)
        if (autoSelectActors) {
          // Auto-select top 4 actors and REVERSE them (so leads are last)
          const topFour = allCast.slice(0, 4).reverse()
          setActors(topFour.map((actor, index) => ({
            ...actor,
            order: index
          })))
        }
      }
    } catch (error) {
      console.error("Error fetching cast:", error)
    } finally {
      setLoadingCast(false)
    }
  }

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie)
    fetchMovieCast(movie.id)
    setShowMovieSelector(false)
    setFunFacts([])
    setFunFactIndex(0)
    setFunFact("")
    // Notify parent of movie change
    onMovieChange?.(movie.id.toString())
  }

  // Auto-generate fun fact after user selects a movie (new puzzles only).
  //
  // Two gates on top of the original `funFacts.length === 0` check:
  //
  //   1. `autoRunState === 'idle'` — while the auto-smart-gen flow for this
  //      tab is running or flashing a "success" banner, let the strategy's
  //      own fun_fact win instead of racing it with a second stream.
  //   2. The selected movie isn't the URL-deep-linked one. If the admin hit
  //      `/admin/puzzle-editor?movieId=X`, the auto-smart-gen flow *owns* X
  //      end-to-end on every movie-based tab — including inactive ones that
  //      only auto-run once the admin switches to them. Without this gate,
  //      the non-active tabs would still `fetchAndSelectMovie(X)` on mount,
  //      fall through this effect (because their autoRunState is "idle"
  //      since the auto-run is deferred), and fire a redundant fun-facts
  //      stream that sometimes returns empty and throws "No fun facts
  //      returned".
  useEffect(() => {
    const isAutoRunOwnedMovie = Boolean(
      selectedMovie &&
        prefilledMovieId &&
        String(selectedMovie.id) === String(prefilledMovieId),
    )
    if (
      selectedMovie &&
      !isEditMode &&
      funFacts.length === 0 &&
      autoRunState === 'idle' &&
      !isAutoRunOwnedMovie
    ) {
      generateFunFact()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovie, autoRunState])

  // After the auto-smart-gen flow finishes successfully, fetch the
  // fun_fact list. The Cast Climb strategy intentionally leaves
  // `fun_fact` null so the admin (or this effect) picks one from a
  // freshly streamed batch — same behaviour as if the admin had
  // selected the movie manually and clicked the button.
  //
  // The legacy effect above is gated on `!isAutoRunOwnedMovie` so it
  // doesn't race the auto-run; this effect picks up the slack.
  useEffect(() => {
    if (autoRunState !== 'success') return
    if (!selectedMovie) return
    if (isEditMode) return
    if (funFacts.length > 0) return
    if (isGeneratingFact) return
    generateFunFact()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunState, selectedMovie])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setActors((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const generateFunFact = async () => {
    if (isGeneratingFact && funFactsAbortRef.current) {
      funFactsAbortRef.current.abort()
      funFactsAbortRef.current = null
      return
    }

    if (!selectedMovie) return

    if (funFacts.length > 0 && funFactIndex < funFacts.length - 1) {
      const nextIndex = funFactIndex + 1
      setFunFactIndex(nextIndex)
      setFunFact(funFacts[nextIndex].text)
      return
    }

    const controller = new AbortController()
    funFactsAbortRef.current = controller
    setIsGeneratingFact(true)
    setFunFacts([])
    setFunFactIndex(0)

    try {
      const year = selectedMovie.release_date
        ? new Date(selectedMovie.release_date).getFullYear()
        : undefined
      let firstShown = false
      const facts = await streamFunFacts({
        title: selectedMovie.title,
        year,
        signal: controller.signal,
        onFact: (fact, index) => {
          setFunFacts((prev) => {
            const next = prev.slice()
            next[index] = fact
            return next
          })
          if (!firstShown) {
            firstShown = true
            setFunFactIndex(index)
            // Functional setState so we don't clobber a fun_fact that
            // was already populated (e.g. by an in-flight smart-gen
            // race or user typing). The legacy "first fact wins"
            // behaviour only kicks in when the field is empty.
            setFunFact((prev) => prev || fact.text)
          }
        },
      })
      if (facts.length === 0 && !firstShown) {
        throw new Error('No fun facts returned')
      }
    } catch (e: any) {
      if (isAbortError(e)) return
      console.error('Fun fact generation failed:', e)
      alert(e?.message || 'Failed to generate fun facts')
    } finally {
      setIsGeneratingFact(false)
      if (funFactsAbortRef.current === controller) {
        funFactsAbortRef.current = null
      }
    }
  }

  const handleSmartGeneration = async (puzzleData: any) => {
    // Smart Generate always OVERRIDES the editor's current state.
    setActors([])
    setFullCast([])
    setFunFact("")
    setFunFacts([])
    setFunFactIndex(0)

    // If the generator chose a different date than we were editing, drop edit
    // mode so we don't collide with the existing record when saving.
    if (puzzleData.puzzle_date && puzzleData.puzzle_date !== puzzleDate) {
      setIsEditMode(false)
    }

    if (puzzleData.puzzle_date) {
      setPuzzleDate(puzzleData.puzzle_date)
      setIsPublished(true)
      onDateChange?.(puzzleData.puzzle_date)
    }

    const movieId =
      puzzleData.selectedMovie?.id ?? puzzleData.film_id ?? null
    if (movieId != null) {
      await fetchAndSelectMovie(String(movieId))
    }

    if (puzzleData.actors && puzzleData.actors.length > 0) {
      setActors(puzzleData.actors)
    }

    if (puzzleData.fun_fact) {
      setFunFact(puzzleData.fun_fact)
    } else if (puzzleData.suggestion_reasoning) {
      // Suggestion path: prefill the fun-fact field with the model's one-line
      // reasoning so the admin has context. They can regenerate via the
      // fun-facts button.
      setFunFact(puzzleData.suggestion_reasoning)
    }
  }

  const pushAutoRunActivity = useCallback(
    (entry: Omit<AutoSmartGenActivityEntry, 'id'>) => {
      setAutoRunActivity((prev) => {
        autoRunActivityIdRef.current += 1
        const next = [
          ...prev,
          { ...entry, id: String(autoRunActivityIdRef.current) },
        ]
        if (next.length > 40) next.shift()
        return next
      })
    },
    [],
  )

  const resetAutoRunBanner = useCallback(() => {
    setAutoRunState('idle')
    setAutoRunActivity([])
    setAutoRunError(null)
    setAutoRunErrorDetail(null)
  }, [])

  const stopAutoRun = useCallback(() => {
    if (autoRunAbortRef.current) {
      autoRunAbortRef.current.abort()
      autoRunAbortRef.current = null
    }
    resetAutoRunBanner()
  }, [resetAutoRunBanner])

  // Banner "Choose another movie" — abort the stream, drop the current
  // selection, and open the manual movie selector.
  const handleAutoRunChangeMovie = useCallback(() => {
    if (autoRunAbortRef.current) {
      autoRunAbortRef.current.abort()
      autoRunAbortRef.current = null
    }
    resetAutoRunBanner()
    setSelectedMovie(null)
    setActors([])
    setFullCast([])
    setFunFact("")
    setFunFacts([])
    setFunFactIndex(0)
    onMovieChange?.(null)
    setShowMovieSelector(true)
  }, [onMovieChange, resetAutoRunBanner])

  const runAutoSmartGen = useCallback(
    async (movieId: string) => {
      const numericId = Number(movieId)
      if (!Number.isFinite(numericId) || numericId <= 0) return

      // Flip to `running` *before* any awaits so the fun-fact effect (which
      // is gated on `autoRunState === 'idle'`) doesn't race us and fire a
      // redundant fun-facts stream while we resolve the target date.
      if (autoRunAbortRef.current) autoRunAbortRef.current.abort()
      const controller = new AbortController()
      autoRunAbortRef.current = controller
      setAutoRunState('running')
      setAutoRunActivity([])
      setAutoRunError(null)
      setAutoRunErrorDetail(null)
      autoRunActivityIdRef.current = 0

      let targetDate = puzzleDate
      if (!targetDate) {
        try {
          const res = await fetch(
            `/api/admin/puzzles/next-available-date?gameType=cast-climb`,
            { signal: controller.signal },
          )
          const data = (await res.json().catch(() => ({}))) as {
            date?: string
            error?: string
          }
          if (!res.ok || !data?.date) {
            setAutoRunState('failed')
            setAutoRunError(
              data?.error ||
                'Could not find an available puzzle date. Set one manually and try again.',
            )
            return
          }
          targetDate = data.date
        } catch (err) {
          if (isSmartGenAbortError(err)) return
          setAutoRunState('failed')
          setAutoRunError(
            err instanceof Error
              ? err.message
              : 'Could not resolve the next available puzzle date.',
          )
          return
        }
      }

      try {
        await streamSmartGeneration({
          gameType: 'cast-climb',
          targetDate,
          forcedFilmId: numericId,
          signal: controller.signal,
          onEvent: (event) => {
            switch (event.kind) {
              case 'status':
                pushAutoRunActivity({
                  label: event.label,
                  detail: event.detail,
                  variant: 'status',
                })
                break
              case 'tool-call':
                pushAutoRunActivity({
                  label: `Tool call: ${event.name}`,
                  variant: 'tool',
                })
                break
              case 'candidates':
                pushAutoRunActivity({
                  label: `Model proposed ${event.ids.length} candidate${event.ids.length === 1 ? '' : 's'}`,
                  detail: event.reasoning,
                  variant: 'candidates',
                })
                break
              case 'candidate-scored': {
                const a = event.attempt
                const ok = a.verdict === 'accepted'
                const actorsPreview = a.actors
                  ? a.actors
                      .slice(0, 2)
                      .map((x) => x.name)
                      .join(', ')
                  : undefined
                pushAutoRunActivity({
                  label: `${ok ? '✓' : '✗'} ${a.movie.title}${a.movie.release_year ? ` (${a.movie.release_year})` : ''}`,
                  detail: ok
                    ? actorsPreview
                      ? `Cast: ${actorsPreview}${a.actors && a.actors.length > 2 ? ` + ${a.actors.length - 2} more` : ''}`
                      : a.reasoning
                    : a.reason,
                  variant: ok ? 'scored-ok' : 'scored-ko',
                })
                break
              }
              case 'success':
                setAutoRunState('success')
                handleSmartGeneration({
                  ...(event.puzzle as object),
                  puzzle_date:
                    (event.puzzle as { puzzle_date?: string }).puzzle_date ||
                    targetDate,
                })
                setTimeout(() => {
                  resetAutoRunBanner()
                }, 1500)
                break
              case 'exclusion_conflict':
                setAutoRunState('excluded')
                setAutoRunError(event.reason)
                break
              case 'suggestions':
                setAutoRunState('failed')
                setAutoRunError(
                  event.error ||
                    'Could not build a Cast Climb puzzle from this movie.',
                )
                break
              case 'error':
                setAutoRunState('failed')
                setAutoRunError(event.error)
                if ('detail' in event && event.detail) {
                  setAutoRunErrorDetail(event.detail)
                }
                break
              case 'aborted':
              case 'done':
              case 'model-text-delta':
                break
            }
          },
        })
      } catch (err) {
        if (isSmartGenAbortError(err)) return
        setAutoRunState('failed')
        setAutoRunError(
          err instanceof Error ? err.message : 'Auto smart-gen failed.',
        )
      } finally {
        if (autoRunAbortRef.current === controller) {
          autoRunAbortRef.current = null
        }
      }
    },
    [puzzleDate, pushAutoRunActivity, resetAutoRunBanner],
  )

  // Kick off auto smart-gen when:
  //   - A `?movieId=<id>` is present in the URL
  //   - This editor is the currently active tab (eager for the initial tab;
  //     lazy for the others, which fire on first switch)
  //   - The admin isn't editing an existing puzzle
  //   - We haven't already auto-run for this specific (gameType, movieId)
  //     in this session
  useEffect(() => {
    if (!prefilledMovieId) return
    if (!isActiveTab) return
    if (puzzleId) return
    if (isEditMode) return
    const key = `cast-climb:${prefilledMovieId}`
    if (autoRunKeyRef.current === key) return
    autoRunKeyRef.current = key
    runAutoSmartGen(prefilledMovieId)
  }, [prefilledMovieId, isActiveTab, puzzleId, isEditMode, runAutoSmartGen])

  // Clean up any in-flight auto-run stream on unmount.
  useEffect(() => {
    return () => {
      if (autoRunAbortRef.current) {
        autoRunAbortRef.current.abort()
        autoRunAbortRef.current = null
      }
    }
  }, [])

  const savePuzzle = async () => {
    if (!selectedMovie || actors.length !== 4) {
      alert("Please select a movie and exactly 4 actors")
      return
    }

    // Require date only if published
    if (isPublished && !puzzleDate) {
      alert("Published puzzles must have a puzzle date")
      return
    }

    setLoading(true)
    try {

      const puzzleData = {
        puzzle_date: puzzleDate || null,
        film_id: selectedMovie.id,
        film_title: selectedMovie.title,
        film_poster_url: selectedMovie.poster_path,
        film_release_year: new Date(selectedMovie.release_date).getFullYear(),
        actors: actors.map((actor, index) => ({
          ...actor,
          order: index // Update order based on current position
        })),
        fun_fact: funFact,
        is_published: isPublished
      }

      // Use admin API to save or update the puzzle
      const apiUrl = isEditMode && puzzleId 
        ? `/api/admin/puzzles/update`
        : '/api/admin/puzzles/save'
      
      const requestBody = isEditMode && puzzleId
        ? { gameType: 'cast_climb', puzzleData, puzzleId }
        : { gameType: 'cast_climb', puzzleData }

      const response = await fetch(apiUrl, {
        method: isEditMode && puzzleId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'save'} puzzle`)
      }

      alert(`Puzzle ${isEditMode ? 'updated' : 'created'} successfully!`)
      
      // Only reset form for new puzzles, not updates
      if (!isEditMode) {
        setPuzzleDate("")
        setSelectedMovie(null)
        setActors([])
        setFunFact("")
        setDifficultyLevel(1)
        setIsPublished(false)
      }
    } catch (error: any) {
      console.error("Error saving puzzle:", error)
      
      if (error?.message) {
        alert(`Failed to save puzzle: ${error.message}`)
      } else {
        alert("Failed to save puzzle")
      }
    } finally {
      setLoading(false)
    }
  }

  const getPreviewData = () => {
    return {
      movie: {
        title: selectedMovie?.title || "",
        poster_path: selectedMovie?.poster_path || null,
        release_date: selectedMovie?.release_date || ""
      },
      actors: actors.map(actor => ({
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path,
        order: actor.order
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
    <div className="space-y-4">
      {autoRunState !== 'idle' && (
        <AutoSmartGenBanner
          state={autoRunState}
          gameLabel="Cast Climb"
          activity={autoRunActivity}
          errorMessage={autoRunError}
          errorDetail={autoRunErrorDetail}
          onStop={stopAutoRun}
          onChangeMovie={
            autoRunState === 'excluded' || autoRunState === 'failed'
              ? handleAutoRunChangeMovie
              : undefined
          }
          onDismiss={
            autoRunState === 'failed' ? resetAutoRunBanner : undefined
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Form */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {isEditMode ? "Edit Cast Climb Puzzle" : "Create Cast Climb Puzzle"}
            </h2>
            <p className="text-sm text-gray-600">
              Players guess the movie from its cast members revealed one by one
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

        {/* Difficulty Level */}
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <select
            id="difficulty"
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
            className="w-full h-10 px-3 rounded-md border border border-[rgb(var(--silver))] bg-white"
          >
            <option value={1}>Easy (1)</option>
            <option value={2}>Medium (2)</option>
            <option value={3}>Hard (3)</option>
            <option value={4}>Very Hard (4)</option>
            <option value={5}>Expert (5)</option>
          </select>
        </div>

        {/* Movie Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Movie to Guess</Label>
            <SmartGenerationDialog
              gameType="cast-climb"
              targetDate={puzzleDate}
              onGenerate={handleSmartGeneration}
            />
          </div>
          {selectedMovie ? (
            <MovieDetailsCard 
              movie={selectedMovie}
              onRemove={() => {
                setSelectedMovie(null)
                setActors([])
                setFullCast([])
              }}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start border-2 border-cinema-silver hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
              onClick={() => setShowMovieSelector(true)}
            >
              <Film className="w-4 h-4 mr-2" />
              Select Movie
            </Button>
          )}
        </div>

        {/* Cast Members */}
        {selectedMovie && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cast Members (4 actors)</Label>
              {loadingCast && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <Info className="w-4 h-4 inline mr-1" />
              Drag to reorder actors. They will be revealed in this order (supporting cast first).
            </div>

            {actors.length > 0 && (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={actors.map(a => a.id || `actor-${a.order}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {actors.map((actor, index) => (
                        <SortableActor key={`${actor.id}-${index}`} actor={actor} index={index} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCastSelector(true)}
                  className="w-full mt-3"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Change Actor Selection
                </Button>
              </>
            )}
          </div>
        )}

        {/* Fun Fact */}
        {selectedMovie && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fun-fact">Fun Fact (Optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateFunFact}
                >
                  {isGeneratingFact ? (
                    <>
                      <StopCircle className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      {funFacts.length > 0 && funFactIndex < funFacts.length - 1 ? 'Next' : 'Generate'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!funFacts.length || !funFacts[funFactIndex]?.source?.url}
                  className={cn((!funFacts.length || !funFacts[funFactIndex]?.source?.url) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '')}
                  onClick={() => {
                    const url = funFacts[funFactIndex]?.source?.url
                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Source
                </Button>
              </div>
            </div>
            <Textarea
              id="fun-fact"
              value={funFact}
              onChange={(e) => setFunFact(e.target.value)}
              placeholder="Add an interesting fact about this movie..."
              rows={3}
            />
          </div>
        )}

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={savePuzzle}
          disabled={loading || !selectedMovie || actors.length !== 4}
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
      </div>

      {/* Preview */}
      <div className="lg:sticky lg:top-6 h-fit">
        {selectedMovie && actors.length > 0 && (
          <PuzzlePreview
            type="cast-climb"
            puzzleDate={puzzleDate || new Date().toISOString().split('T')[0]}
            isPublished={isPublished}
            data={getPreviewData()}
          />
        )}
      </div>

      {/* Movie Selector Modal */}
      {showMovieSelector && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMovieSelector(false)
            }
          }}
        >
          <Card className="admin-modal-silver w-full max-w-2xl h-[85vh] flex flex-col relative overflow-hidden" style={{ borderRadius: 0 }}>
            <button
              onClick={() => setShowMovieSelector(false)}
              className="admin-modal-ghost-close absolute right-4 top-4 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 pr-12 flex flex-col h-full overflow-hidden">
              <h3 className="text-lg font-semibold mb-4 font-funnel-display-bold text-neutral-900">Select Movie</h3>
              <MovieSelector
                onSelect={handleSelectMovie}
                onClose={() => setShowMovieSelector(false)}
                disableUsedInGame={'cast_climb'}
                excludeGameFromUsage={'cast_climb'}
              />
            </div>
          </Card>
        </div>,
        document.body
      )}
      
      {/* Cast Selector Modal */}
      {showCastSelector && fullCast.length > 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="admin-modal-silver w-full max-w-2xl max-h-[80vh] overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select 4 Actors</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCastSelector(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Select exactly 4 actors. They will be revealed in this order during gameplay.
                </p>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  Note: Lead actors (shown first below) will be revealed LAST in the game.
                </p>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh] space-y-2">
                {fullCast.map((actor) => {
                  const isSelected = actors.some(a => a.id === actor.id)
                  return (
                    <button
                      key={actor.id}
                      onClick={() => {
                        if (isSelected) {
                          setActors(actors.filter(a => a.id !== actor.id))
                        } else if (actors.length < 4) {
                          setActors([...actors, { ...actor, order: actors.length }])
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        isSelected
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      )}
                      disabled={!isSelected && actors.length >= 4}
                    >
                      <div className="flex-shrink-0">
                        {actor.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                            alt={actor.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{actor.name}</p>
                        <p className="text-xs text-gray-500 truncate">as {actor.character}</p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Selected {actors.findIndex(a => a.id === actor.id) + 1}
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setShowCastSelector(false)}
                  disabled={actors.length !== 4}
                >
                  Confirm Selection ({actors.length}/4)
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}
      </div>
    </div>
  )
}
