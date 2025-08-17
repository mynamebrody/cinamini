"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Calendar, Save, Loader2, Plus, X, DollarSign, Film, ArrowRight } from "lucide-react"
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

  const supabase = getSupabaseClient()

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
            budget: pair.movieA.budget,
            revenue: pair.movieA.revenue,
            runtime: pair.movieA.runtime,
            vote_average: pair.movieA.vote_average
          } : null,
          movieB: pair.movieB ? {
            id: pair.movieB.id,
            title: pair.movieB.title,
            poster_path: pair.movieB.poster_path,
            release_date: pair.movieB.release_date,
            budget: pair.movieB.budget,
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

      {/* Movie Pairs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Movie Pairs</h3>
          <Badge variant="outline">
            {moviePairs.filter(p => p.movieA && p.movieB).length}/{TOTAL_PAIRS} Complete
          </Badge>
        </div>

        <div className="space-y-4">
          {moviePairs.map((pair, pairIdx) => (
            <Card key={`pair-${pairIdx}`} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 text-sm font-medium text-gray-600 w-20">
                  Round {pairIdx + 1}
                </div>
                
                {/* Movie A */}
                <div className="flex-1 max-w-[200px]">
                  {pair.movieA ? (
                    <div className="relative group">
                      <MovieCard movie={pair.movieA} />
                      <button
                        onClick={() => removeMovie(pairIdx, "A")}
                        className="absolute top-1 right-1 p-1 bg-white/90 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openMovieSelector(pairIdx, "A")}
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
                    <div className="relative group">
                      <MovieCard movie={pair.movieB} />
                      <button
                        onClick={() => removeMovie(pairIdx, "B")}
                        className="absolute top-1 right-1 p-1 bg-white/90 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openMovieSelector(pairIdx, "B")}
                      className="w-full h-[82px] bg-gray-100 rounded-lg border-2 border-dashed border border-[rgb(var(--silver))] hover:border-gray-400 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                      <Plus className="w-5 h-5 mb-0.5" />
                      <span className="text-xs">Add Movie</span>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

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