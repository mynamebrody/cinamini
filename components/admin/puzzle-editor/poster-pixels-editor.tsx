"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Calendar, Save, Loader2, Plus, X, Film, Image } from "lucide-react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import MovieSelector from "../shared/movie-selector"
import MovieDetailsCard from "../shared/movie-details-card"
import PosterClarityPreview from "../shared/poster-clarity-preview"
import { cn } from "@/lib/utils"
import { POSTER_PIXELS_LEVELS } from "@/lib/poster-pixels-config"

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

interface PosterPixelsEditorProps {
  prefilledDate?: string | null
  prefilledMovieId?: string | null
  onDateChange?: (date: string | null) => void
  onMovieChange?: (movieId: string | null) => void
  puzzleId?: string | null
}

export default function PosterPixelsEditor({ prefilledDate, prefilledMovieId, onDateChange, onMovieChange, puzzleId }: PosterPixelsEditorProps) {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [funFact, setFunFact] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)

  const supabase = getSupabaseClient()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMovieSelector) {
        setShowMovieSelector(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showMovieSelector])

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
    console.log('PosterPixelsEditor puzzleId changed:', puzzleId)
    if (puzzleId) {
      console.log('Loading puzzle data for ID:', puzzleId)
      loadPuzzleData(puzzleId)
    }
  }, [puzzleId])

  const loadPuzzleData = async (puzzleId: string) => {
    setLoadingPuzzle(true)
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=poster_pixels`)
      
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
    // Notify parent of movie change
    onMovieChange?.(movie.id.toString())
  }

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
      let puzzleNumber: number
      let seedValue: string
      
      if (isEditMode && puzzleId) {
        // For updates, preserve existing puzzle number and seed value
        const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=poster_pixels`)
        const existingPuzzle = await response.json()
        puzzleNumber = existingPuzzle.puzzle_number
        seedValue = existingPuzzle.seed_value
      } else {
        // For new puzzles, generate new values
        const timestamp = Date.now().toString(36)
        const dateStr = puzzleDate ? puzzleDate.replace(/-/g, '') : `draft${timestamp}`
        seedValue = `pp_${dateStr}_${timestamp}`.substring(0, 32) // Max 32 chars

        // Get the highest puzzle number and increment
        const { data: latestPuzzle } = await supabase
          .from('poster_pixels_puzzles')
          .select('puzzle_number')
          .order('puzzle_number', { ascending: false })
          .limit(1)
          .single()

        puzzleNumber = (latestPuzzle?.puzzle_number || 0) + 1
      }

      const puzzleData = {
        puzzle_date: puzzleDate || null,
        film_id: selectedMovie.id,
        film_title: selectedMovie.title,
        film_poster_url: selectedMovie.poster_path,
        film_release_year: selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : null,
        clarity_levels: Array.from(POSTER_PIXELS_LEVELS), // Default clarity progression
        fun_fact: funFact.trim() || null,
        is_published: isPublished,
        seed_value: seedValue,
        puzzle_number: puzzleNumber
      }

      console.log('Saving puzzle with data:', puzzleData)

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
      
      console.log(`Puzzle ${isEditMode ? 'updated' : 'saved'} successfully:`, result)
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
          <Label>Movie (must have poster)</Label>
          {selectedMovie ? (
            <MovieDetailsCard 
              movie={selectedMovie}
              onRemove={() => setSelectedMovie(null)}
            />
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
                <span>This movie doesn't have a poster. Please select a different movie.</span>
              </div>
            </div>
          )}
        </div>

        {/* Fun Fact */}
        <div className="space-y-2">
          <Label htmlFor="fun-fact">Fun Fact (optional)</Label>
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
        {selectedMovie && selectedMovie.poster_path ? (
          <PosterClarityPreview
            posterPath={selectedMovie.poster_path}
            movieTitle={selectedMovie.title}
            clarityLevels={Array.from(POSTER_PIXELS_LEVELS)}
            currentLevel={POSTER_PIXELS_LEVELS[2]}
          />
        ) : (
          <Card>
            <div className="p-8 text-center text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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
          <Card className="admin-modal-silver w-full max-w-2xl h-[80vh] flex flex-col relative" style={{ borderRadius: 0 }}>
            <button
              onClick={() => setShowMovieSelector(false)}
              className="admin-modal-ghost-close absolute right-4 top-4 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 pr-12 flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-4 font-funnel-display-bold text-neutral-900">Select Movie</h3>
              <MovieSelector
                onSelect={handleSelectMovie}
                onClose={() => setShowMovieSelector(false)}
                excludeIds={[]}
                requirePoster={true}
              />
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  )
}