"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Save, Loader2, Plus, X, Image as ImageIcon, Check, Sparkles, ExternalLink, StopCircle } from "lucide-react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import MovieSelector from "../shared/movie-selector"
import MovieDetailsCard from "../shared/movie-details-card"
import PosterClarityPreview from "../shared/poster-clarity-preview"
import SmartGenerationDialog from "../shared/smart-generation-dialog"
import { cn } from "@/lib/utils"
import { POSTER_PIXELS_LEVELS } from "@/lib/poster-pixels-config"
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

interface PosterOption {
  file_path: string
  aspect_ratio: number
  height: number
  width: number
  vote_average: number
  vote_count: number
  iso_639_1: string
  isDefault?: boolean
}

interface PosterPixelsEditorProps {
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

export default function PosterPixelsEditor({ prefilledDate, prefilledMovieId, onDateChange, onMovieChange, puzzleId, isActiveTab = false }: PosterPixelsEditorProps) {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [funFact, setFunFact] = useState("")
  const [funFacts, setFunFacts] = useState<Array<FunFact>>([])
  const [funFactIndex, setFunFactIndex] = useState(0)
  const [isGeneratingFact, setIsGeneratingFact] = useState(false)
  const funFactsAbortRef = useRef<AbortController | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)
  
  // Alternative poster states
  const [showAlternativesModal, setShowAlternativesModal] = useState(false)
  const [alternativePosters, setAlternativePosters] = useState<PosterOption[]>([])
  const [selectedPosterPath, setSelectedPosterPath] = useState<string | null>(null)
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMovieSelector) {
        setShowMovieSelector(false)
      }
      if (e.key === 'Escape' && showAlternativesModal) {
        setShowAlternativesModal(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showMovieSelector, showAlternativesModal])

  // Handle prefilled values from URL parameters
  useEffect(() => {
    if (prefilledDate && !isEditMode) {
      setPuzzleDate(prefilledDate)
      setIsPublished(true) // Auto-publish when date is set
    }
    if (prefilledMovieId && !isEditMode) {
      fetchAndSelectMovie(prefilledMovieId)
    }
  }, [prefilledDate, prefilledMovieId, isEditMode])

  // Load existing puzzle data if puzzleId is provided
  useEffect(() => {
    if (puzzleId) {
      loadPuzzleData(puzzleId)
    }
  }, [puzzleId])

  const loadPuzzleData = async (puzzleId: string) => {
    setLoadingPuzzle(true)
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=poster_pixels`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to load puzzle data')
      }
      
      const response_data = await response.json()
      
      // Extract puzzle data from the response
      const puzzleData = response_data.puzzle
      
      // Set edit mode
      setIsEditMode(true)
      
      // Load puzzle fields
      setPuzzleDate(puzzleData.puzzle_date || "")
      setIsPublished(!!puzzleData.puzzle_date) // Published if it has a date
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
        
        // Load poster override if it exists (handle older puzzles without this field)
        if (puzzleData.film_poster_override_url) {
          setSelectedPosterPath(puzzleData.film_poster_override_url)
        } else {
          setSelectedPosterPath(puzzleData.film_poster_url || movie.poster_path) // Use default, fallback to movie poster
        }
      }
      
    } catch (error) {
      console.error('Error loading puzzle:', error)
      alert('Failed to load puzzle data. Please try again.')
    } finally {
      setLoadingPuzzle(false)
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

  const fetchAndSelectMovie = async (movieId: string) => {
    try {
      const response = await fetch(`/api/movies/${movieId}/details`)
      if (response.ok) {
        const movieData = await response.json()
        
        // Validate that movie has a poster
        if (!movieData.poster_path) {
          console.warn("Selected movie doesn't have a poster, skipping auto-selection")
          return
        }

        const movie: Movie = {
          id: movieData.id,
          title: movieData.title,
          poster_path: movieData.poster_path,
          release_date: movieData.release_date || '',
          overview: movieData.overview,
          budget: movieData.budget,
          revenue: movieData.revenue,
          vote_average: movieData.vote_average,
          runtime: movieData.runtime
        }
        
        setSelectedMovie(movie)
      }
    } catch (error) {
      console.error('Error fetching movie details:', error)
    }
  }

  const handleSelectMovie = (movie: Movie) => {
    // Validate that movie has a poster
    if (!movie.poster_path) {
      alert("Selected movie must have a poster for Poster Pixels game")
      return
    }
    
    setSelectedMovie(movie)
    setShowMovieSelector(false)
    
    // Reset poster selection to default when selecting a new movie
    setSelectedPosterPath(movie.poster_path)
    setAlternativePosters([])
    // Clear generated fun facts on new movie
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
  // fun_fact list. The Poster Pixels strategy intentionally leaves
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

  // Fetch alternative posters from TMDB
  const fetchAlternativePosters = async () => {
    if (!selectedMovie) return

    setLoadingAlternatives(true)
    try {
      const response = await fetch(`/api/movies/${selectedMovie.id}/images`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch alternative posters')
      }

      const data = await response.json()
      const posters: PosterOption[] = data.posters || []

      // Add the default poster as the first option
      const defaultPoster: PosterOption = {
        file_path: selectedMovie.poster_path!,
        aspect_ratio: 0.67, // Standard movie poster ratio
        height: 1500,
        width: 1000,
        vote_average: 0,
        vote_count: 0,
        iso_639_1: 'en',
        isDefault: true
      }

      const allPosters = [defaultPoster, ...posters]
      setAlternativePosters(allPosters)
      setShowAlternativesModal(true)
    } catch (error) {
      console.error('Error fetching alternative posters:', error)
      alert('Failed to load alternative posters. Please try again.')
    } finally {
      setLoadingAlternatives(false)
    }
  }

  // Handle poster selection from alternatives modal
  const handleSelectPoster = (posterPath: string) => {
    setSelectedPosterPath(posterPath)
    setShowAlternativesModal(false)
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
    setFunFact("")
    setFunFacts([])
    setFunFactIndex(0)
    setSelectedPosterPath(null)
    setAlternativePosters([])

    // If the generator chose a different date than we were editing, drop edit
    // mode so save doesn't collide with the existing record.
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

    if (puzzleData.fun_fact) {
      setFunFact(puzzleData.fun_fact)
    } else if (puzzleData.suggestion_reasoning) {
      // Suggestion path: prefill the fun-fact field with the model's one-line
      // reasoning so the admin has context. They can regenerate later.
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
    setFunFact("")
    setFunFacts([])
    setFunFactIndex(0)
    setSelectedPosterPath(null)
    setAlternativePosters([])
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
            `/api/admin/puzzles/next-available-date?gameType=poster-pixels`,
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
          gameType: 'poster-pixels',
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
                    ? a.posterUrl
                      ? `Poster resolved`
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
                    'Could not build a Poster Pixels puzzle from this movie.',
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
    const key = `poster-pixels:${prefilledMovieId}`
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
    if (!selectedMovie) {
      alert("Please select a movie")
      return
    }

    if (!selectedMovie.poster_path) {
      alert("Selected movie must have a poster")
      return
    }

    // Require date only if published
    if (isPublished && !puzzleDate) {
      alert("Published puzzles must have a puzzle date")
      return
    }

    setLoading(true)
    try {
      // Generate puzzle metadata (existing for edits, new for creates)
      let seedValue: string
      
      if (isEditMode && puzzleId) {
        // For updates, preserve existing seed value
        const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=poster_pixels`)
        const existingPuzzle = await response.json()
        seedValue = existingPuzzle.seed_value
      } else {
        // For new puzzles, generate new values
        const timestamp = Date.now().toString(36)
        const dateStr = puzzleDate ? puzzleDate.replace(/-/g, '') : `draft${timestamp}`
        seedValue = `pp_${dateStr}_${timestamp}`.substring(0, 32) // Max 32 chars
      }

      const puzzleData = {
        puzzle_date: puzzleDate || null,
        film_id: selectedMovie.id,
        film_title: selectedMovie.title,
        film_poster_url: selectedMovie.poster_path,
        film_poster_override_url: selectedPosterPath !== selectedMovie.poster_path ? selectedPosterPath : null,
        film_release_year: selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : null,
        fun_fact: funFact.trim() || null,
        is_published: isPublished,
        seed_value: seedValue
      }


      // Use API endpoint to save or update with service role permissions
      const apiUrl = isEditMode && puzzleId 
        ? `/api/admin/puzzles/update`
        : '/api/admin/puzzles/save'
      
      const requestBody = isEditMode && puzzleId
        ? { gameType: 'poster_pixels', puzzleData, puzzleId }
        : { gameType: 'poster_pixels', puzzleData }

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
      
      alert(`Puzzle ${isEditMode ? 'updated' : 'created'} successfully!`)
      
      // Only reset form for new puzzles, not updates
      if (!isEditMode) {
        setPuzzleDate("")
        setSelectedMovie(null)
        setFunFact("")
        setIsPublished(false)
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
          gameLabel="Poster Pixels"
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
              {isEditMode ? "Edit Poster Pixels Puzzle" : "Create Poster Pixels Puzzle"}
            </h2>
            <p className="text-sm text-gray-600">
              Players guess the movie from progressively clearer poster reveals
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
            <Label>Movie (must have poster)</Label>
            <SmartGenerationDialog
              gameType="poster-pixels"
              targetDate={puzzleDate}
              onGenerate={handleSmartGeneration}
            />
          </div>
          {selectedMovie ? (
            <div className="space-y-3">
              <MovieDetailsCard 
                movie={selectedMovie}
                onRemove={() => setSelectedMovie(null)}
              />
              
              {/* Alternative Posters Button */}
              <Button
                variant="outline"
                className="w-full justify-center bg-white text-gray-600 border-0 shadow-none hover:text-cinema-red hover:border hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)] hover:-translate-y-0.5 transition-all duration-200"
                onClick={fetchAlternativePosters}
                disabled={loadingAlternatives}
              >
                {loadingAlternatives ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                Alternative Posters
              </Button>
              
              {/* Show selected poster indicator */}
              {selectedPosterPath && selectedPosterPath !== selectedMovie.poster_path && (
                <div className="text-xs text-cinema-gold bg-cinema-gold/10 p-2 rounded border border-cinema-gold/30">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    <span>Using alternative poster</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start border-2 border-cinema-silver hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
              onClick={() => setShowMovieSelector(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Select Movie
            </Button>
          )}
          {selectedMovie && !selectedMovie.poster_path && (
            <div className="text-sm text-cinema-red bg-red-50 p-2 rounded border border-red-200">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" />
                <span>This movie doesn&apos;t have a poster. Please select a different movie.</span>
              </div>
            </div>
          )}
        </div>

        {/* Fun Fact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="fun-fact">Fun Fact (optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateFunFact}
                disabled={!selectedMovie && !isGeneratingFact}
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
            maxLength={500}
          />
          <div className="text-xs text-gray-500 text-right">
            {funFact.length}/500 characters
          </div>
        </div>

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={savePuzzle}
          disabled={loading || !selectedMovie || !selectedMovie.poster_path}
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
        {selectedMovie && (selectedPosterPath || selectedMovie.poster_path) ? (
          <PosterClarityPreview
            posterPath={selectedPosterPath || selectedMovie.poster_path}
            movieTitle={selectedMovie.title}
            clarityLevels={Array.from(POSTER_PIXELS_LEVELS)}
            currentLevel={POSTER_PIXELS_LEVELS[2]}
          />
        ) : (
          <Card>
            <div className="p-8 text-center text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Select a movie with a poster to see preview</p>
            </div>
          </Card>
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
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
                excludeIds={[]}
                requirePoster={true}
                disableUsedInGame={'poster_pixels'}
                excludeGameFromUsage={'poster_pixels'}
              />
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Alternative Posters Modal */}
      {showAlternativesModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAlternativesModal(false)
            }
          }}
        >
          <Card className="admin-modal-silver w-full max-w-4xl max-h-[90vh] flex flex-col relative" style={{ borderRadius: 0 }}>
            <button
              onClick={() => setShowAlternativesModal(false)}
              className="admin-modal-ghost-close absolute right-4 top-4 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 pr-12 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold font-funnel-display-bold text-neutral-900">
                  Choose Alternative Poster
                </h3>
                <div className="text-sm text-gray-600">
                  {alternativePosters.length} options available
                </div>
              </div>
              
              {/* Poster Grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
                  {alternativePosters.map((poster, index) => (
                    <div
                      key={`${poster.file_path}-${index}`}
                      className={cn(
                        "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200",
                        selectedPosterPath === poster.file_path
                          ? "border-cinema-red shadow-[2px_2px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]"
                          : "border-gray-200 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]"
                      )}
                      onClick={() => handleSelectPoster(poster.file_path)}
                    >
                      <div className="aspect-[2/3] relative">
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${poster.file_path}`}
                          alt={`Alternative poster ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="342px"
                        />
                        
                        {/* Default badge */}
                        {poster.isDefault && (
                          <div className="absolute top-2 left-2 bg-cinema-gold text-black px-2 py-1 text-xs font-semibold rounded shadow-sm">
                            Default
                          </div>
                        )}
                        
                        {/* Selection indicator */}
                        {selectedPosterPath === poster.file_path && (
                          <div className="absolute inset-0 bg-cinema-red/20 flex items-center justify-center">
                            <div className="bg-cinema-red text-white rounded-full p-2">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                      </div>
                      
                      {/* Poster info */}
                      <div className="p-2 bg-white">
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>{poster.width} × {poster.height}</div>
                          {poster.vote_count > 0 && (
                            <div className="flex items-center gap-1">
                              <span>★</span>
                              <span>{poster.vote_average.toFixed(1)} ({poster.vote_count})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAlternativesModal(false)}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowAlternativesModal(false)}
                  className="bg-cinema-red text-white border border-cinema-red hover:bg-white hover:text-cinema-red transition-all duration-200 shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29)] hover:shadow-[2px_2px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29),6px_6px_0px_rgb(153,37,29)] hover:-translate-y-0.5"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Selection
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
