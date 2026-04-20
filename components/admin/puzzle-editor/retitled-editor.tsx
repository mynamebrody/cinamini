"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Save, Loader2, Plus, X, Shuffle, GripVertical, Sparkles, ExternalLink, StopCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { getCountryFlag, getCountryName } from "@/lib/flag-emojis"
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


interface AlternativeTitle {
  iso_3166_1: string
  title: string
  type: string
  /** Where the title came from: TMDB alternative_titles or the translations endpoint. */
  source?: 'alternative' | 'translation' | 'smart-generation'
}

interface PuzzleOption extends Movie {
  isCorrect: boolean
}


function SortableOption({ option, index, onRemove }: { option: PuzzleOption; index: number; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${option.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border transition-all",
        isDragging ? "opacity-50 border-blue-300 shadow-lg" : 
        option.isCorrect ? "bg-green-50 border-green-300" : "bg-white border-gray-200"
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
      <div className="flex-1 flex items-center gap-2">
        <p className="text-sm font-medium">{option.title}</p>
        {option.isCorrect && (
          <Badge variant="default" className="text-xs bg-green-600 text-white">
            Correct Answer
          </Badge>
        )}
      </div>
      {!option.isCorrect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

interface RetitledEditorProps {
  prefilledDate?: string | null
  prefilledMovieId?: string | null
  puzzleId?: string | null
  /**
   * Whether this editor is currently the active tab in the puzzle-editor
   * shell. Drives eager-vs-lazy auto-smart-generation when `prefilledMovieId`
   * is provided via URL. All editor tabs mount simultaneously, so without
   * this flag every movie-based tab would auto-run OpenAI calls on load.
   */
  isActiveTab?: boolean
  onDateChange?: (date: string | null) => void
  onMovieChange?: (movieId: string | null) => void
}

export default function RetitledEditor({ prefilledDate, prefilledMovieId, puzzleId, isActiveTab = false, onDateChange, onMovieChange }: RetitledEditorProps) {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [selectedTitle, setSelectedTitle] = useState<AlternativeTitle | null>(null)
  const [distractors, setDistractors] = useState<Movie[]>([])
  const [allOptions, setAllOptions] = useState<PuzzleOption[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [selectingDistractorIndex, setSelectingDistractorIndex] = useState<number | null>(null)
  const [alternativeTitles, setAlternativeTitles] = useState<AlternativeTitle[]>([])
  const [loadingTitles, setLoadingTitles] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [loadingRandom, setLoadingRandom] = useState(false)
  const [englishTranslation, setEnglishTranslation] = useState("")
  const [countryName, setCountryName] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)
  const [existingPuzzleId, setExistingPuzzleId] = useState<string | null>(null)
  const [translationNote, setTranslationNote] = useState("")
  const [funFacts, setFunFacts] = useState<Array<FunFact>>([])
  const [funFactIndex, setFunFactIndex] = useState(0)
  const [isGeneratingNote, setIsGeneratingNote] = useState(false)
  const funFactsAbortRef = useRef<AbortController | null>(null)

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

  // Ref to track the last loaded puzzle ID to prevent infinite loops
  const lastLoadedPuzzleId = useRef<string | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setAllOptions((items) => {
        const oldIndex = items.findIndex((item) => `option-${item.id}` === active.id)
        const newIndex = items.findIndex((item) => `option-${item.id}` === over?.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const fetchAlternativeTitles = useCallback(async (movieId: number, currentMovieTitle?: string) => {
    setLoadingTitles(true)
    try {
      // `/localized-titles` returns the same merged list the smart generator
      // picks from (alternative_titles + translations, filtered to supported
      // countries). That guarantees the generator's pick exists in this
      // dropdown.
      const response = await fetch(`/api/movies/${movieId}/localized-titles`)
      if (response.ok) {
        const data = await response.json() as {
          titles?: Array<{
            title: string
            country_code: string
            country_name: string
            english_name?: string
          }>
        }
        const titles: AlternativeTitle[] = (data.titles ?? [])
          .filter((t) => t.country_code && t.title)
          .filter((t) => !currentMovieTitle || t.title !== currentMovieTitle)
          .map((t) => ({
            iso_3166_1: t.country_code,
            title: t.title,
            type: 'localized',
            source: 'alternative' as const,
          }))
        setAlternativeTitles(titles)
      }
    } catch (error) {
      console.error("Error fetching alternative titles:", error)
    } finally {
      setLoadingTitles(false)
    }
  }, [])

  useEffect(() => {
    if (selectedMovie) {
      fetchAlternativeTitles(selectedMovie.id, selectedMovie.title)
    }
  }, [selectedMovie, fetchAlternativeTitles])

  // When the smart generator picks a title that (for any reason) isn't
  // already in the fetched list — e.g., the generator tuned the string
  // slightly, or the TMDB request lost the race — surface it as a synthetic
  // row so the dropdown can still render it as the selected value instead
  // of silently falling back to the placeholder.
  useEffect(() => {
    if (!selectedTitle) return
    if (alternativeTitles.length === 0) return
    const exists = alternativeTitles.some(
      (t) =>
        t.iso_3166_1 === selectedTitle.iso_3166_1 &&
        t.title === selectedTitle.title,
    )
    if (exists) return
    setAlternativeTitles((prev) => [
      { ...selectedTitle, source: 'smart-generation' },
      ...prev,
    ])
  }, [selectedTitle, alternativeTitles])

  useEffect(() => {
    if (!selectedTitle) return
    setCustomTitle(selectedTitle.title)

    // The smart generator already produced a back-translation AND a country
    // label that came directly from the model's proposal — re-running Google
    // Translate would clobber both. Skip the refresh for smart-gen picks so
    // the admin keeps the exact context the model chose.
    if (selectedTitle.source === 'smart-generation') return

    if (!isEditMode) {
      const autoCountryName = getCountryName(selectedTitle.iso_3166_1)
      setCountryName(autoCountryName)
    }

    const translateTitle = async () => {
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: selectedTitle.title,
            targetLang: 'en',
          }),
        })
        if (response.ok) {
          const data = await response.json()
          setEnglishTranslation(data.translatedText)
        }
      } catch (error) {
        console.error('Translation error:', error)
        setEnglishTranslation(selectedTitle.title)
      }
    }
    translateTitle()
  }, [selectedTitle, isEditMode])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMovieSelector) {
        setShowMovieSelector(false)
        setSelectingDistractorIndex(null)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showMovieSelector])

  const fetchAndSelectMovie = useCallback(async (movieId: string): Promise<Movie | null> => {
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
        return movie
      }
    } catch (error) {
      console.error('Error fetching movie details:', error)
    }
    return null
  }, [])

  const loadExistingPuzzle = useCallback(async (puzzleId: string) => {
    setLoadingPuzzle(true)
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=retitled`)
      if (response.ok) {
        const data = await response.json()
        const puzzle = data.puzzle
        
        setExistingPuzzleId(puzzleId)
        setIsEditMode(true)
        
        // Load puzzle data
        setPuzzleDate(puzzle.puzzle_date || "")
        setCustomTitle(puzzle.localized_title || "")
        setEnglishTranslation(puzzle.english_translation || "")
        setCountryName(puzzle.country_name || "")
        setIsPublished(puzzle.is_published || false)
        setTranslationNote(puzzle.translation_note || "")
        
        // Create selected title object from puzzle data
        if (puzzle.country_code && puzzle.localized_title) {
          setSelectedTitle({
            iso_3166_1: puzzle.country_code,
            title: puzzle.localized_title,
            type: 'translation'
          })
        }
        
        // Load the movie
        if (puzzle.film_id) {
          await fetchAndSelectMovie(puzzle.film_id.toString())
        }
        
        // Load all movies in the correct order using option_order if available
        if (puzzle.option_order && Array.isArray(puzzle.option_order)) {
          // Use the saved option_order to reconstruct allOptions in the exact saved order
          const allMoviesInOrder = await Promise.all(
            puzzle.option_order.map(async (movieId: number) => {
              try {
                const movieResponse = await fetch(`/api/movies/${movieId}/details`)
                if (movieResponse.ok) {
                  const movieData = await movieResponse.json()
                  return {
                    id: movieData.id,
                    title: movieData.title,
                    poster_path: movieData.poster_path,
                    release_date: movieData.release_date || '',
                    isCorrect: movieId === puzzle.film_id // Mark correct answer
                  }
                }
              } catch (error) {
                console.error(`Error fetching movie ${movieId}:`, error)
              }
              return null
            })
          )
          const validMovies = allMoviesInOrder.filter(Boolean)
          
          // Set allOptions directly with the correct order
          setAllOptions(validMovies)
          
          // Also set distractors for backward compatibility
          const distractorMovies = validMovies.filter(movie => !movie.isCorrect)
          setDistractors(distractorMovies)
          
        } else if (puzzle.distractor_ids && Array.isArray(puzzle.distractor_ids)) {
          // Fallback for older puzzles without option_order
          const distractorMovies = await Promise.all(
            puzzle.distractor_ids.map(async (id: number) => {
              try {
                const movieResponse = await fetch(`/api/movies/${id}/details`)
                if (movieResponse.ok) {
                  const movieData = await movieResponse.json()
                  return {
                    id: movieData.id,
                    title: movieData.title,
                    poster_path: movieData.poster_path,
                    release_date: movieData.release_date || ''
                  }
                }
              } catch (error) {
                console.error(`Error fetching distractor movie ${id}:`, error)
              }
              return null
            })
          )
          const validDistractors = distractorMovies.filter(Boolean)
          setDistractors(validDistractors)
          
          // This will trigger the useEffect to reconstruct allOptions with correct answer first
        }
        
      } else {
        console.error('Failed to load puzzle:', response.status)
        alert('Failed to load puzzle for editing')
      }
    } catch (error) {
      console.error('Error loading puzzle:', error)
      alert('Error loading puzzle for editing')
    } finally {
      setLoadingPuzzle(false)
    }
  }, [fetchAndSelectMovie])

  // Load existing puzzle if puzzleId is provided
  useEffect(() => {
    if (puzzleId && !loadingPuzzle && puzzleId !== lastLoadedPuzzleId.current) {
      lastLoadedPuzzleId.current = puzzleId
      loadExistingPuzzle(puzzleId)
    }
  }, [puzzleId, loadExistingPuzzle, loadingPuzzle])

  // Build `allOptions` whenever we have an answer movie but no options
  // assembled yet. Fires for FOUR entry points:
  //   1. Loading an existing puzzle in edit mode (legacy path).
  //   2. Smart Generation prefilling distractors via handleSmartGeneration.
  //   3. Picking a Smart Generation suggestion (no distractors yet — the
  //      effect still seeds [correctOption] so the wrong-answer block
  //      renders and the admin can use "Add Wrong Answer" / "Load Random".
  //   4. Manual flow where the admin picks a movie via the search.
  // The `allOptions.length === 0` guard means we never clobber an existing
  // ordering — once allOptions is populated, the user owns the order via
  // drag-and-drop / shuffle.
  useEffect(() => {
    if (!selectedMovie) return
    if (allOptions.length > 0) return
    const correctOption: PuzzleOption = { ...selectedMovie, isCorrect: true }
    const distractorOptions: PuzzleOption[] = distractors.map((d) => ({
      ...d,
      isCorrect: false,
    }))
    setAllOptions([correctOption, ...distractorOptions])
  }, [selectedMovie, distractors, allOptions.length])

  // Handle prefilled values from URL parameters (only when not in edit mode)
  useEffect(() => {
    if (!isEditMode) {
      if (prefilledDate) {
        setPuzzleDate(prefilledDate)
        setIsPublished(true) // Auto-publish when date is set
      }
      if (prefilledMovieId) {
        fetchAndSelectMovie(prefilledMovieId)
      }
    }
  }, [prefilledDate, prefilledMovieId, isEditMode, fetchAndSelectMovie])

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

  // Auto-generate translation note after user selects a movie (new puzzles only).
  //
  // Two gates on top of the original `!translationNote / !isGeneratingNote`:
  //
  //   1. `autoRunState === 'idle'` — while the auto-smart-gen flow for this
  //      tab is running or flashing a "success" banner, let the strategy's
  //      own translation_note win instead of racing it with a fun-facts
  //      stream.
  //   2. The selected movie isn't the URL-deep-linked one. If the admin hit
  //      `/admin/puzzle-editor?movieId=X`, the auto-smart-gen flow *owns* X
  //      end-to-end on every movie-based tab — including inactive ones that
  //      only auto-run once the admin switches to them. Without this gate,
  //      the non-active tabs would still `fetchAndSelectMovie(X)` on mount,
  //      fall through this effect (because their autoRunState is "idle"
  //      since the auto-run is deferred), and fire a redundant fun-facts
  //      stream that sometimes returns empty and throws "No facts returned".
  useEffect(() => {
    const isAutoRunOwnedMovie = Boolean(
      selectedMovie &&
        prefilledMovieId &&
        String(selectedMovie.id) === String(prefilledMovieId),
    )
    if (
      selectedMovie &&
      !isEditMode &&
      !translationNote &&
      !isGeneratingNote &&
      autoRunState === 'idle' &&
      !isAutoRunOwnedMovie
    ) {
      generateTranslationNote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovie, autoRunState])

  // After the auto-smart-gen flow finishes successfully, preload the
  // 6-item fun-facts list so the admin can cycle through them without
  // having to click "Generate fun fact" first.
  //
  // This is the counterpart to the legacy effect above: that effect is
  // gated on `!isAutoRunOwnedMovie` to avoid racing the auto-run. Once
  // the auto-run is *done* the race is moot — we can safely fetch.
  // `generateTranslationNote`'s onFact uses a functional setState so it
  // won't overwrite the back-translation that smart-gen already set.
  useEffect(() => {
    if (autoRunState !== 'success') return
    if (!selectedMovie) return
    if (isEditMode) return
    if (funFacts.length > 0) return
    if (isGeneratingNote) return
    generateTranslationNote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunState, selectedMovie])

  const pushAutoRunActivity = useCallback(
    (entry: Omit<AutoSmartGenActivityEntry, 'id'>) => {
      setAutoRunActivity((prev) => {
        autoRunActivityIdRef.current += 1
        const next = [
          ...prev,
          { ...entry, id: String(autoRunActivityIdRef.current) },
        ]
        // keep the list bounded so a long run doesn't blow out memory
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

  // Wired to the banner's "Choose another movie" button. Clears the
  // prefilled id and reopens the movie selector so the admin can pick a
  // different film without mucking with the URL.
  const handleAutoRunChangeMovie = useCallback(() => {
    if (autoRunAbortRef.current) {
      autoRunAbortRef.current.abort()
      autoRunAbortRef.current = null
    }
    resetAutoRunBanner()
    setSelectedMovie(null)
    setAlternativeTitles([])
    setSelectedTitle(null)
    setCustomTitle("")
    setEnglishTranslation("")
    setCountryName("")
    onMovieChange?.(null)
    setSelectingDistractorIndex(null)
    setShowMovieSelector(true)
  }, [onMovieChange, resetAutoRunBanner])

  const runAutoSmartGen = useCallback(
    async (movieId: string) => {
      const numericId = Number(movieId)
      if (!Number.isFinite(numericId) || numericId <= 0) return

      // Flip to `running` *before* any awaits so the translation-note effect
      // (which is gated on `autoRunState === 'idle'`) doesn't race us and
      // fire a redundant fun-facts stream while we resolve the target date.
      if (autoRunAbortRef.current) autoRunAbortRef.current.abort()
      const controller = new AbortController()
      autoRunAbortRef.current = controller
      setAutoRunState('running')
      setAutoRunActivity([])
      setAutoRunError(null)
      setAutoRunErrorDetail(null)
      autoRunActivityIdRef.current = 0

      // Resolve target date: prefer what's already in the editor; otherwise
      // ask the server for the next available slot for this game type.
      let targetDate = puzzleDate
      if (!targetDate) {
        try {
          const res = await fetch(
            `/api/admin/puzzles/next-available-date?gameType=retitled`,
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
          gameType: 'retitled',
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
                pushAutoRunActivity({
                  label: `${ok ? '✓' : '✗'} ${a.movie.title}${a.movie.release_year ? ` (${a.movie.release_year})` : ''}`,
                  detail: ok
                    ? a.localizedTitle
                      ? `“${a.localizedTitle.title}” — ${a.localizedTitle.countryName} · back-translates to “${a.localizedTitle.backTranslation}” (similarity ${a.localizedTitle.similarity.toFixed(2)})`
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
                  puzzle_date: (event.puzzle as { puzzle_date?: string }).puzzle_date || targetDate,
                })
                // collapse the banner after a short "done" flash
                setTimeout(() => {
                  resetAutoRunBanner()
                }, 1500)
                break
              case 'exclusion_conflict':
                setAutoRunState('excluded')
                setAutoRunError(event.reason)
                break
              case 'suggestions':
                // For a forced run, `suggestions` means the strategy tried
                // the forced film but couldn't build a valid puzzle from it
                // (e.g. no distinctive localized title). Treat as a
                // terminal failure — no suggestion-list UI here.
                setAutoRunState('failed')
                setAutoRunError(
                  event.error ||
                    'Could not build a Retitled puzzle from this movie.',
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
  //   - This editor is the currently active tab (eager for the initial
  //     tab; lazy for the others, which fire on first switch)
  //   - The admin isn't editing an existing puzzle (`!puzzleId`)
  //   - We haven't already auto-run for this specific (gameType, movieId)
  //     in this session (so toggling tabs doesn't re-trigger)
  useEffect(() => {
    if (!prefilledMovieId) return
    if (!isActiveTab) return
    if (puzzleId) return
    if (isEditMode) return
    const key = `retitled:${prefilledMovieId}`
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

  const handleSelectMovie = (movie: Movie) => {
    if (selectingDistractorIndex !== null) {
      const newDistractors = [...distractors]
      newDistractors[selectingDistractorIndex] = movie
      setDistractors(newDistractors)
      setSelectingDistractorIndex(null)
      // Update allOptions with new distractor
      updateAllOptions(selectedMovie, newDistractors)
    } else {
      setSelectedMovie(movie)
      setSelectedTitle(null)
      // Create initial allOptions with the correct answer first
      const correctOption: PuzzleOption = { ...movie, isCorrect: true }
      const distractorOptions: PuzzleOption[] = distractors.map(d => ({ ...d, isCorrect: false }))
      setAllOptions([correctOption, ...distractorOptions])
      // Notify parent of movie change
      onMovieChange?.(movie.id.toString())
    }
    setShowMovieSelector(false)
  }
  
  // Helper function to update allOptions when distractors change
  const updateAllOptions = (correctMovie: Movie | null, newDistractors: Movie[]) => {
    if (!correctMovie) {
      setAllOptions([])
      return
    }
    
    const correctOption: PuzzleOption = { ...correctMovie, isCorrect: true }
    const distractorOptions: PuzzleOption[] = newDistractors.map(d => ({ ...d, isCorrect: false }))
    
    // If allOptions already exists, preserve the order but update the items
    if (allOptions.length > 0) {
      const newOptions: PuzzleOption[] = []
      const allItems = [correctOption, ...distractorOptions]
      
      // Preserve existing order where possible
      allOptions.forEach(option => {
        const found = allItems.find(item => item.id === option.id)
        if (found) {
          newOptions.push(found)
        }
      })
      
      // Add any new items that weren't in the previous list
      allItems.forEach(item => {
        if (!newOptions.find(option => option.id === item.id)) {
          newOptions.push(item)
        }
      })
      
      setAllOptions(newOptions)
    } else {
      setAllOptions([correctOption, ...distractorOptions])
    }
  }

  const addDistractor = () => {
    if (distractors.length < 5) {
      setSelectingDistractorIndex(distractors.length)
      setShowMovieSelector(true)
    }
  }

  const removeDistractor = (index: number) => {
    const newDistractors = distractors.filter((_, i) => i !== index)
    setDistractors(newDistractors)
    // Update allOptions
    updateAllOptions(selectedMovie, newDistractors)
  }

  const shuffleAllOptions = () => {
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5)
    setAllOptions(shuffled)
  }

  const loadRandomMovies = async () => {
    setLoadingRandom(true)
    try {
      let movies = []
      let endpoint = ''
      
      // If a movie is selected, try to get similar movies first
      if (selectedMovie?.id) {
        endpoint = `/api/movies/${selectedMovie.id}/similar`
        const similarResponse = await fetch(endpoint)
        
        if (similarResponse.ok) {
          const similarData = await similarResponse.json()
          movies = similarData.results || []
        } else {
          console.warn('Similar movies API failed, falling back to trending')
          // Fall back to trending if similar movies fails
          endpoint = '/api/movies/trending?time_window=week'
          const trendingResponse = await fetch(endpoint)
          if (trendingResponse.ok) {
            const trendingData = await trendingResponse.json()
            movies = trendingData.results || []
          }
        }
      } else {
        // If no movie selected, use trending movies
        endpoint = '/api/movies/trending?time_window=week'
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          movies = data.results || []
        }
      }
      
      // Filter and process movies
      const eligibleMovies = movies
        .filter((m: any) => !distractors.some(d => d.id === m.id))
        .filter((m: any) => m.id !== selectedMovie?.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 - distractors.length)
      
      // Convert to our Movie interface
      const randomMovies: Movie[] = eligibleMovies.map((m: any) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path,
        release_date: m.release_date
      }))
      
      const newDistractors = [...distractors, ...randomMovies].slice(0, 5)
      setDistractors(newDistractors)
      // Update allOptions
      updateAllOptions(selectedMovie, newDistractors)
      
    } catch (error) {
      console.error("Error loading movies:", error)
      alert("Failed to load movies")
    } finally {
      setLoadingRandom(false)
    }
  }

  const savePuzzle = async () => {
    const wrongAnswers = allOptions.filter(option => !option.isCorrect)

    if (!selectedMovie || !customTitle.trim() || !selectedTitle || wrongAnswers.length < 3) {
      alert("Please complete all required fields and add at least 3 wrong answer options")
      return
    }

    // Require date only if published
    if (isPublished && !puzzleDate) {
      alert("Published puzzles must have a puzzle date")
      return
    }

    setLoading(true)
    try {

      // Generate a seed value - must match the regex constraint: ^[a-zA-Z0-9_-]+$
      const timestamp = Date.now().toString(36)
      const dateStr = puzzleDate ? puzzleDate.replace(/-/g, '') : `draft${timestamp}`
      const seedValue = `retitled_${dateStr}_${timestamp}`.substring(0, 32) // Max 32 chars


      const puzzleData: any = {
        puzzle_date: puzzleDate || null,
        film_id: selectedMovie.id,
        film_title: selectedMovie.title,
        localized_title: customTitle.trim(),
        country_code: selectedTitle.iso_3166_1,
        country_name: countryName.trim() || selectedTitle.iso_3166_1,
        distractor_ids: allOptions.filter(option => !option.isCorrect).map(option => option.id),
        option_order: allOptions.map(option => option.id), // Store complete order including correct answer
        is_published: isPublished,
        english_translation: englishTranslation.trim(),
        translation_note: translationNote.trim() || null
      }

      // Only include seed_value field when creating new puzzles
      if (!isEditMode) {
        puzzleData.seed_value = seedValue
      }


      let response

      if (isEditMode && existingPuzzleId) {
        // Update existing puzzle
        response = await fetch('/api/admin/puzzles/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            puzzleId: existingPuzzleId,
            gameType: 'retitled',
            puzzleData
          })
        })
      } else {
        // Create new puzzle
        response = await fetch('/api/admin/puzzles/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameType: 'retitled',
            puzzleData
          })
        })
      }

      const result = await response.json()
      
      if (!response.ok) {
        console.error("API error:", result)
        throw new Error(result.error || 'Failed to save puzzle')
      }
      
      
      if (isEditMode) {
        alert("Puzzle updated successfully!")
        // Keep form data for further editing
      } else {
        alert("Puzzle created successfully!")
        // Reset form
        setPuzzleDate("")
        setSelectedMovie(null)
        setSelectedTitle(null)
        setDistractors([])
        setAllOptions([])
        setIsPublished(false)
        setAlternativeTitles([])
        setCustomTitle("")
        setEnglishTranslation("")
        setCountryName("")
      }
      
    } catch (error: any) {
      console.error("Error saving puzzle:", error)
      
      // The error message from the API is already user-friendly
      if (error?.message) {
        // Check for specific constraint messages
        if (error.message.includes('puzzle_date')) {
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

  const handleSmartGeneration = async (puzzleData: any) => {
    // Smart Generate always OVERRIDES the editor's current state.
    setDistractors([])
    setAllOptions([])
    setAlternativeTitles([])
    setCustomTitle("")
    setEnglishTranslation("")
    setSelectedTitle(null)
    setCountryName("")
    setTranslationNote("")
    setFunFacts([])
    setFunFactIndex(0)

    // If the generator chose a different date than we were editing, switch
    // into "new puzzle" mode so save doesn't collide with the existing record.
    if (puzzleData.puzzle_date && puzzleData.puzzle_date !== puzzleDate) {
      setIsEditMode(false)
      setExistingPuzzleId(null)
    }

    if (puzzleData.puzzle_date) {
      setPuzzleDate(puzzleData.puzzle_date)
      setIsPublished(true)
      onDateChange?.(puzzleData.puzzle_date)
    }

    // Resolve the base movie. Suggestions come with `selectedMovie`, winners
    // come with `film_id` directly.
    const movieId =
      puzzleData.selectedMovie?.id ?? puzzleData.film_id ?? null
    let correctMovie: Movie | null = null
    if (movieId != null) {
      correctMovie = await fetchAndSelectMovie(String(movieId))
    }

    // Prefill the localized title block from either the winning puzzle OR
    // the suggestion's proposed alternative title so the admin sees the
    // same thing the model was considering.
    if (puzzleData.localized_title) {
      setCustomTitle(puzzleData.localized_title)
    }
    if (puzzleData.english_translation) {
      setEnglishTranslation(puzzleData.english_translation)
    }
    if (puzzleData.country_code) {
      setSelectedTitle({
        iso_3166_1: puzzleData.country_code,
        title: puzzleData.localized_title ?? '',
        type: 'translation',
        source: 'smart-generation',
      })
      setCountryName(
        puzzleData.country_name || getCountryName(puzzleData.country_code),
      )
    }

    if (puzzleData.distractor_ids && puzzleData.distractor_ids.length > 0) {
      const distractorMovies = await Promise.all(
        puzzleData.distractor_ids.map(async (id: number) => {
          const response = await fetch(`/api/movies/${id}/details`)
          if (response.ok) {
            const movieData = await response.json()
            return {
              id: movieData.id,
              title: movieData.title,
              poster_path: movieData.poster_path,
              release_date: movieData.release_date || '',
              isCorrect: false
            }
          }
          return null
        })
      )

      const validDistractors = distractorMovies.filter(m => m !== null) as PuzzleOption[]
      setDistractors(validDistractors)

      // Seed allOptions atomically with both the correct answer AND the
      // distractors. The `useEffect([selectedMovie, distractors, ...])`
      // above would otherwise fire after the `setDistractors([])`/
      // `setAllOptions([])` batch commits but *before* the distractors
      // below have landed, writing `[correctOption]` on its own — and
      // then the `allOptions.length > 0` guard would lock the real
      // distractors out for the rest of the session.
      if (correctMovie) {
        const correctOption: PuzzleOption = {
          ...correctMovie,
          isCorrect: true,
        }
        setAllOptions([correctOption, ...validDistractors])
      }
    }

    if (puzzleData.translation_note) {
      setTranslationNote(puzzleData.translation_note)
    } else if (puzzleData.suggestion_reasoning) {
      // On the suggestion path we haven't generated a user-facing note yet;
      // seed the textarea with the model's one-line reasoning so the admin
      // has context. They can overwrite it or regenerate via fun-facts.
      setTranslationNote(puzzleData.suggestion_reasoning)
    }
  }

  const generateTranslationNote = async () => {
    // If a stream is in-flight, treat the button as a Stop affordance.
    if (isGeneratingNote && funFactsAbortRef.current) {
      funFactsAbortRef.current.abort()
      funFactsAbortRef.current = null
      return
    }

    if (!selectedMovie) return

    // Cycle through preloaded facts first.
    if (funFacts.length > 0 && funFactIndex < funFacts.length - 1) {
      const nextIndex = funFactIndex + 1
      setFunFactIndex(nextIndex)
      setTranslationNote(funFacts[nextIndex].text)
      return
    }

    const controller = new AbortController()
    funFactsAbortRef.current = controller
    setIsGeneratingNote(true)
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
            // Functional setState so we don't clobber a translation_note
            // that the auto-smart-gen flow (or a previous run) already
            // set for this movie. The legacy "first fact becomes the
            // translation note" behaviour only kicks in when the field
            // is genuinely empty.
            setTranslationNote((prev) => prev || fact.text)
          }
        },
      })
      if (facts.length === 0 && !firstShown) {
        throw new Error('No facts returned')
      }
    } catch (e: any) {
      if (isAbortError(e)) return
      console.error('Translation note generation failed:', e)
      alert(e?.message || 'Failed to generate translation notes')
    } finally {
      setIsGeneratingNote(false)
      if (funFactsAbortRef.current === controller) {
        funFactsAbortRef.current = null
      }
    }
  }

  const getPreviewData = () => {
    const flag = selectedTitle ? getCountryFlag(selectedTitle.iso_3166_1) : "🏳️"
    // Use allOptions directly to maintain user-specified order
    const options = allOptions.map(option => ({
      id: option.id,
      title: option.title,
      isCorrect: option.isCorrect
    }))

    return {
      flagEmoji: flag,
      countryName: countryName.trim() || selectedTitle?.iso_3166_1 || "...",
      localizedTitle: customTitle.trim() || selectedTitle?.title || "...",
      englishTranslation: englishTranslation.trim() || "",
      options
    }
  }

  return (
    <div className="space-y-4">
      {autoRunState !== 'idle' && (
        <AutoSmartGenBanner
          state={autoRunState}
          gameLabel="Retitled"
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
              {isEditMode ? "Edit Retitled Puzzle" : "Create Retitled Puzzle"}
            </h2>
            <p className="text-sm text-gray-600">
              Players guess the original movie from its foreign title
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

        {/* Movie Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Original Movie</Label>
            <SmartGenerationDialog
              gameType="retitled"
              targetDate={puzzleDate}
              onGenerate={handleSmartGeneration}
            />
          </div>
          {selectedMovie ? (
            <MovieDetailsCard 
              movie={selectedMovie}
              onRemove={() => {
                setSelectedMovie(null)
                setAlternativeTitles([])
                setSelectedTitle(null)
                setCustomTitle("")
                setEnglishTranslation("")
                setCountryName("")
              }}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start border-2 border-cinema-silver hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
              onClick={() => {
                setSelectingDistractorIndex(null)
                setShowMovieSelector(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Select Movie
            </Button>
          )}
        </div>

        {/* Alternative Title Selection */}
        {selectedMovie && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Alternative Title</Label>
              {loadingTitles && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              )}
            </div>
            
            {alternativeTitles.length > 0 ? (
              <Select 
                value={selectedTitle ? `${selectedTitle.iso_3166_1}:${selectedTitle.title}` : ""}
                onValueChange={(value) => {
                  const [country, ...titleParts] = value.split(":")
                  const title = titleParts.join(":")
                  const selected = alternativeTitles.find(
                    t => t.iso_3166_1 === country && t.title === title
                  )
                  setSelectedTitle(selected || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an alternative title" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-white border border-gray-200">
                  {alternativeTitles.map((title, idx) => (
                    <SelectItem
                      key={`title-${title.iso_3166_1}-${title.title}-${idx}`}
                      value={`${title.iso_3166_1}:${title.title}`}
                      className="hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{getCountryFlag(title.iso_3166_1)}</span>
                        <span className="flex-1">{title.title}</span>
                        {title.source === 'smart-generation' ? (
                          <Badge
                            variant="default"
                            className="text-xs bg-purple-600 text-white"
                          >
                            Smart pick
                          </Badge>
                        ) : (
                          title.type && (
                            <Badge variant="secondary" className="text-xs">
                              {title.type}
                            </Badge>
                          )
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-500 p-3 border rounded-lg bg-gray-50">
                {loadingTitles ? "Loading alternative titles..." : "No alternative titles available for this movie"}
              </div>
            )}
            
            {/* Editable Title Field */}
            {selectedTitle && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="custom-title" className="text-sm text-gray-600">Edit Title (optional)</Label>
                  <Input
                    id="custom-title"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Customize the title..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="english-translation" className="text-sm text-gray-600">English Translation</Label>
                  <Input
                    id="english-translation"
                    type="text"
                    value={englishTranslation}
                    onChange={(e) => setEnglishTranslation(e.target.value)}
                    placeholder="English translation of the title..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country-name" className="text-sm text-gray-600">Country Name</Label>
                  <Input
                    id="country-name"
                    type="text"
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    placeholder="Country name (e.g., Spain, France, Germany...)"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Translation Notes / Fun Facts */}
        {selectedMovie && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="translation-note">Translation Notes / Fun Facts</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateTranslationNote}
                >
                  {isGeneratingNote ? (
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
              id="translation-note"
              value={translationNote}
              onChange={(e) => setTranslationNote(e.target.value)}
              placeholder="Context or fun fact about this localization (optional)"
              rows={5}
            />
          </div>
        )}

        {/* Answer Options */}
        {selectedMovie && allOptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Answer Options ({allOptions.length}/6 total, {distractors.length}/5 wrong)</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadRandomMovies}
                  disabled={loadingRandom || distractors.length >= 5}
                >
                  {loadingRandom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shuffleAllOptions}
                  disabled={allOptions.length < 2}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={allOptions.map(option => `option-${option.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {allOptions.map((option, index) => (
                    <SortableOption
                      key={`option-${option.id}`}
                      option={option}
                      index={index}
                      onRemove={() => {
                        if (!option.isCorrect) {
                          const distractorIndex = distractors.findIndex(d => d.id === option.id)
                          if (distractorIndex !== -1) {
                            removeDistractor(distractorIndex)
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {distractors.length < 5 && (
              <Button
                variant="outline"
                className="w-full border-2 border-cinema-silver hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
                onClick={addDistractor}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Wrong Answer
              </Button>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={savePuzzle}
          disabled={loading || !selectedMovie || !selectedTitle || !customTitle.trim() || allOptions.filter(option => !option.isCorrect).length < 3}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditMode ? "Updating..." : "Saving..."}
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
        {selectedMovie && (
          <PuzzlePreview
            type="retitled"
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
              setSelectingDistractorIndex(null)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowMovieSelector(false)
              setSelectingDistractorIndex(null)
            }
          }}
        >
          <Card className="admin-modal-silver w-full max-w-2xl h-[85vh] flex flex-col relative overflow-hidden" style={{ borderRadius: 0 }}>
            <button
              onClick={() => {
                setShowMovieSelector(false)
                setSelectingDistractorIndex(null)
              }}
              className="admin-modal-ghost-close absolute right-4 top-4 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 pr-12 flex flex-col h-full overflow-hidden">
              <h3 className="text-lg font-semibold mb-4 font-funnel-display-bold text-neutral-900">Select Movie</h3>
              <MovieSelector
                onSelect={handleSelectMovie}
                onClose={() => {
                  setShowMovieSelector(false)
                  setSelectingDistractorIndex(null)
                }}
                excludeIds={allOptions.map(option => option.id)}
                disableUsedInGame={selectingDistractorIndex === null ? 'retitled' : undefined}
                excludeGameFromUsage={'retitled'}
              />
            </div>
          </Card>
        </div>,
        document.body
      )}
      </div>
    </div>
  )
}
