"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { getSupabaseClient } from "@/lib/supabase/client"
import { 
  Save, 
  Loader2, 
  X, 
  Film, 
  Users, 
  GripVertical,
  Info,
  Sparkles
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
}

export default function CastClimbEditor({ prefilledDate, prefilledMovieId, onDateChange, onMovieChange, puzzleId }: CastClimbEditorProps) {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [actors, setActors] = useState<Actor[]>([])
  const [funFact, setFunFact] = useState("")
  const [difficultyLevel, setDifficultyLevel] = useState(1)
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingCast, setLoadingCast] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [fullCast, setFullCast] = useState<Actor[]>([])
  const [showCastSelector, setShowCastSelector] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingPuzzle, setLoadingPuzzle] = useState(false)

  const supabase = getSupabaseClient()

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

  // Load existing puzzle data if puzzleId is provided
  useEffect(() => {
    if (puzzleId) {
      loadPuzzleData(puzzleId)
    }
  }, [puzzleId, loadPuzzleData])

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
    // Notify parent of movie change
    onMovieChange?.(movie.id.toString())
  }

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
    if (!selectedMovie) return
    
    setLoading(true)
    try {
      // In a real implementation, this could call an AI API to generate fun facts
      // For now, we'll use placeholder text
      const facts = [
        `The cast had to undergo extensive training for their roles.`,
        `This movie was filmed in multiple locations around the world.`,
        `The production team used innovative techniques for the special effects.`,
        `Several scenes were improvised by the actors.`,
        `The movie's soundtrack became a chart-topping hit.`,
      ]
      setFunFact(facts[Math.floor(Math.random() * facts.length)])
    } finally {
      setLoading(false)
    }
  }

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
      // Get puzzle number (existing for edits, new for creates)
      let nextPuzzleNumber: number
      
      if (isEditMode && puzzleId) {
        // For updates, preserve existing puzzle number
        const response = await fetch(`/api/admin/puzzles/${puzzleId}?gameType=cast_climb`)
        const existingPuzzle = await response.json()
        nextPuzzleNumber = existingPuzzle.puzzle_number
      } else {
        // For new puzzles, get the next number
        const { data: latestPuzzle } = await supabase
          .from('cast_climb_puzzles')
          .select('puzzle_number')
          .order('puzzle_number', { ascending: false })
          .limit(1)
          .single()

        nextPuzzleNumber = (latestPuzzle?.puzzle_number || 0) + 1
      }

      const puzzleData = {
        puzzle_date: puzzleDate || null,
        puzzle_number: nextPuzzleNumber,
        film_id: selectedMovie.id,
        film_title: selectedMovie.title,
        film_poster_url: selectedMovie.poster_path,
        film_release_year: new Date(selectedMovie.release_date).getFullYear(),
        actors: actors.map((actor, index) => ({
          ...actor,
          order: index // Update order based on current position
        })),
        total_actors: 4,
        difficulty_level: difficultyLevel,
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
          <Label>Movie to Guess</Label>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={generateFunFact}
                disabled={loading}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Generate
              </Button>
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
  )
}