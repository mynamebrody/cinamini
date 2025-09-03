"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Save, Loader2, Plus, X, Shuffle, GripVertical, Sparkles, ExternalLink } from "lucide-react"
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
  onDateChange?: (date: string | null) => void
  onMovieChange?: (movieId: string | null) => void
}

export default function RetitledEditor({ prefilledDate, prefilledMovieId, puzzleId, onDateChange, onMovieChange }: RetitledEditorProps) {
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
  const [funFacts, setFunFacts] = useState<Array<{ text: string, source: { title: string, url: string } | null }>>([])
  const [funFactIndex, setFunFactIndex] = useState(0)
  const [isGeneratingNote, setIsGeneratingNote] = useState(false)

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
      const response = await fetch(`/api/movies/${movieId}/alternative-titles`)
      if (response.ok) {
        const data = await response.json()
        const titles = (data.titles || [])
          .filter((t: AlternativeTitle) => t.iso_3166_1 && t.title)
          .filter((t: AlternativeTitle) => !currentMovieTitle || t.title !== currentMovieTitle)
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

  useEffect(() => {
    if (selectedTitle) {
      setCustomTitle(selectedTitle.title)
      
      // Only auto-populate country name when creating new puzzles, not when editing existing ones
      if (!isEditMode) {
        const autoCountryName = getCountryName(selectedTitle.iso_3166_1)
        setCountryName(autoCountryName)
      }
      
      // Translate the title to English
      const translateTitle = async () => {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: selectedTitle.title,
              targetLang: 'en'
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setEnglishTranslation(data.translatedText)
          }
        } catch (error) {
          console.error('Translation error:', error)
          // Fallback to the original title if translation fails
          setEnglishTranslation(selectedTitle.title)
        }
      }
      
      translateTitle()
    }
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
      }
    } catch (error) {
      console.error('Error fetching movie details:', error)
    }
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

  // Reconstruct allOptions when editing mode and both movie and distractors are loaded
  // Only do this if allOptions is empty (for backward compatibility with older puzzles)
  useEffect(() => {
    if (isEditMode && selectedMovie && distractors.length > 0 && allOptions.length === 0) {
      const correctOption: PuzzleOption = { ...selectedMovie, isCorrect: true }
      const distractorOptions: PuzzleOption[] = distractors.map(d => ({ ...d, isCorrect: false }))
      
      // In edit mode for older puzzles without option_order, start with correct answer first
      // User can reorder as needed
      setAllOptions([correctOption, ...distractorOptions])
    }
  }, [isEditMode, selectedMovie, distractors, allOptions.length])

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

  // Auto-generate translation note after user selects a movie (new puzzles only)
  useEffect(() => {
    if (selectedMovie && !isEditMode && !translationNote && !isGeneratingNote) {
      generateTranslationNote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovie])

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
    // Handle smart-generated puzzle data
    if (puzzleData.selectedMovie) {
      // User selected a suggestion - load it as the base movie
      await fetchAndSelectMovie(puzzleData.selectedMovie.id.toString())
    } else if (puzzleData) {
      // Full puzzle generated - populate all fields
      if (puzzleData.film_id) {
        await fetchAndSelectMovie(puzzleData.film_id.toString())
      }
      
      if (puzzleData.puzzle_date) {
        setPuzzleDate(puzzleData.puzzle_date)
      }
      
      if (puzzleData.localized_title) {
        setCustomTitle(puzzleData.localized_title)
      }
      
      if (puzzleData.country_code) {
        setSelectedTitle({
          iso_3166_1: puzzleData.country_code,
          title: puzzleData.localized_title,
          type: 'translation'
        })
        setCountryName(getCountryName(puzzleData.country_code))
      }
      
      // Load distractor movies
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
      }

      if (puzzleData.translation_note) {
        setTranslationNote(puzzleData.translation_note)
      }
    }
  }

  const generateTranslationNote = async () => {
    if (!selectedMovie) return
    
    // Cycle through preloaded facts first
    if (funFacts.length > 0 && funFactIndex < funFacts.length - 1) {
      const nextIndex = funFactIndex + 1
      setFunFactIndex(nextIndex)
      setTranslationNote(funFacts[nextIndex].text)
      return
    }
    
    setIsGeneratingNote(true)
    try {
      const year = selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : undefined
      const resp = await fetch('/api/admin/movies/fun-facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: selectedMovie.title, year })
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate notes')
      }
      const facts = Array.isArray(data.facts) ? data.facts : []
      if (facts.length === 0) {
        throw new Error('No facts returned')
      }
      setFunFacts(facts)
      setFunFactIndex(0)
      setTranslationNote(facts[0].text)
    } catch (e: any) {
      console.error('Translation note generation failed:', e)
      alert(e?.message || 'Failed to generate translation notes')
    } finally {
      setIsGeneratingNote(false)
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
            {!selectedMovie && puzzleDate && (
              <SmartGenerationDialog
                gameType="retitled"
                targetDate={puzzleDate}
                onGenerate={handleSmartGeneration}
              />
            )}
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
                        {title.type && (
                          <Badge variant="secondary" className="text-xs">
                            {title.type}
                          </Badge>
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
                  disabled={isGeneratingNote}
                >
                  {isGeneratingNote ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Generating...
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
              />
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  )
}