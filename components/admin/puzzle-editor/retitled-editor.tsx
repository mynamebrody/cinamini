"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Calendar, Save, Loader2, Plus, X, Globe, Film, Shuffle } from "lucide-react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface RetitledPuzzle {
  id?: string
  puzzle_date: string
  film_id: number
  film_title: string
  localized_title: string
  country_code: string
  distractor_ids: number[]
  is_published: boolean
}

interface Country {
  code: string
  name: string
  flag: string
}

interface AlternativeTitle {
  iso_3166_1: string
  title: string
  type: string
}

const COUNTRY_FLAGS: { [key: string]: string } = {
  "ES": "🇪🇸", "FR": "🇫🇷", "DE": "🇩🇪", "IT": "🇮🇹", "JP": "🇯🇵",
  "KR": "🇰🇷", "BR": "🇧🇷", "MX": "🇲🇽", "RU": "🇷🇺", "CN": "🇨🇳",
  "US": "🇺🇸", "GB": "🇬🇧", "CA": "🇨🇦", "AU": "🇦🇺", "IN": "🇮🇳",
  "AR": "🇦🇷", "PL": "🇵🇱", "NL": "🇳🇱", "SE": "🇸🇪", "NO": "🇳🇴",
  "DK": "🇩🇰", "FI": "🇫🇮", "PT": "🇵🇹", "GR": "🇬🇷", "TR": "🇹🇷",
  "TH": "🇹🇭", "ID": "🇮🇩", "VN": "🇻🇳", "PH": "🇵🇭", "MY": "🇲🇾",
}

export default function RetitledEditor() {
  const [puzzleDate, setPuzzleDate] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [selectedTitle, setSelectedTitle] = useState<AlternativeTitle | null>(null)
  const [distractors, setDistractors] = useState<Movie[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMovieSelector, setShowMovieSelector] = useState(false)
  const [selectingDistractorIndex, setSelectingDistractorIndex] = useState<number | null>(null)
  const [alternativeTitles, setAlternativeTitles] = useState<AlternativeTitle[]>([])
  const [loadingTitles, setLoadingTitles] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [loadingRandom, setLoadingRandom] = useState(false)
  const [englishTranslation, setEnglishTranslation] = useState("")

  const supabase = getSupabaseClient()

  const fetchAlternativeTitles = async (movieId: number) => {
    setLoadingTitles(true)
    try {
      const response = await fetch(`/api/movies/${movieId}/alternative-titles`)
      if (response.ok) {
        const data = await response.json()
        const titles = (data.titles || [])
          .filter((t: AlternativeTitle) => t.iso_3166_1 && t.title)
          .filter((t: AlternativeTitle) => t.title !== selectedMovie?.title)
        setAlternativeTitles(titles)
      }
    } catch (error) {
      console.error("Error fetching alternative titles:", error)
    } finally {
      setLoadingTitles(false)
    }
  }

  useEffect(() => {
    if (selectedMovie) {
      fetchAlternativeTitles(selectedMovie.id)
    }
  }, [selectedMovie])

  useEffect(() => {
    if (selectedTitle) {
      setCustomTitle(selectedTitle.title)
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
  }, [selectedTitle])

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

  const handleSelectMovie = (movie: Movie) => {
    if (selectingDistractorIndex !== null) {
      const newDistractors = [...distractors]
      newDistractors[selectingDistractorIndex] = movie
      setDistractors(newDistractors)
      setSelectingDistractorIndex(null)
    } else {
      setSelectedMovie(movie)
      setSelectedTitle(null)
    }
    setShowMovieSelector(false)
  }

  const addDistractor = () => {
    if (distractors.length < 5) {
      setSelectingDistractorIndex(distractors.length)
      setShowMovieSelector(true)
    }
  }

  const removeDistractor = (index: number) => {
    setDistractors(distractors.filter((_, i) => i !== index))
  }

  const shuffleDistractors = () => {
    const shuffled = [...distractors].sort(() => Math.random() - 0.5)
    setDistractors(shuffled)
  }

  const loadRandomMovies = async () => {
    setLoadingRandom(true)
    try {
      const response = await fetch('/api/movies/trending?time_window=week')
      if (response.ok) {
        const data = await response.json()
        const trendingMovies = data.results || []
        
        const eligibleMovies = trendingMovies
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
        
        setDistractors([...distractors, ...randomMovies].slice(0, 5))
      }
    } catch (error) {
      console.error("Error loading random movies:", error)
      alert("Failed to load random movies")
    } finally {
      setLoadingRandom(false)
    }
  }

  const savePuzzle = async () => {
    if (!selectedMovie || !customTitle.trim() || !selectedTitle || distractors.length < 3) {
      alert("Please complete all required fields and add at least 3 distractor options")
      return
    }

    // Require date only if published
    if (isPublished && !puzzleDate) {
      alert("Published puzzles must have a puzzle date")
      return
    }

    setLoading(true)
    try {
      // Get country name from country code
      const countryNames: { [key: string]: string } = {
        "ES": "Spain", "FR": "France", "DE": "Germany", "IT": "Italy", "JP": "Japan",
        "KR": "South Korea", "BR": "Brazil", "MX": "Mexico", "RU": "Russia", "CN": "China",
        "US": "United States", "GB": "United Kingdom", "CA": "Canada", "AU": "Australia", "IN": "India",
        "AR": "Argentina", "PL": "Poland", "NL": "Netherlands", "SE": "Sweden", "NO": "Norway",
        "DK": "Denmark", "FI": "Finland", "PT": "Portugal", "GR": "Greece", "TR": "Turkey",
        "TH": "Thailand", "ID": "Indonesia", "VN": "Vietnam", "PH": "Philippines", "MY": "Malaysia",
      }

      // Generate a seed value - must match the regex constraint: ^[a-zA-Z0-9_-]+$
      const timestamp = Date.now().toString(36)
      const dateStr = puzzleDate ? puzzleDate.replace(/-/g, '') : `draft${timestamp}`
      const seedValue = `retitled_${dateStr}_${timestamp}`.substring(0, 32) // Max 32 chars

      // Get the highest puzzle number and increment
      const { data: latestPuzzle } = await supabase
        .from('retitled_puzzles')
        .select('puzzle_number')
        .order('puzzle_number', { ascending: false })
        .limit(1)
        .single()

      const puzzleNumber = (latestPuzzle?.puzzle_number || 0) + 1

      const puzzleData = {
        puzzle_date: puzzleDate || null,
        film_id: selectedMovie.id,
        film_title: selectedMovie.title,
        localized_title: customTitle.trim(),
        country_code: selectedTitle.iso_3166_1,
        country_name: countryNames[selectedTitle.iso_3166_1] || selectedTitle.iso_3166_1,
        distractor_ids: distractors.map(d => d.id),
        is_published: isPublished,
        seed_value: seedValue,
        puzzle_number: puzzleNumber,
        english_translation: englishTranslation.trim()
      }

      console.log('Saving puzzle with data:', puzzleData)

      // Use API endpoint to save with service role permissions
      const response = await fetch('/api/admin/puzzles/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType: 'retitled',
          puzzleData
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error("API error:", result)
        throw new Error(result.error || 'Failed to save puzzle')
      }
      
      console.log("Puzzle saved successfully:", result)
      alert("Puzzle created successfully!")
      // Reset form
      setPuzzleDate("")
      setSelectedMovie(null)
      setSelectedTitle(null)
      setDistractors([])
      setIsPublished(false)
      setAlternativeTitles([])
      setCustomTitle("")
      setEnglishTranslation("")
      
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

  const getPreviewData = () => {
    const flag = selectedTitle ? (COUNTRY_FLAGS[selectedTitle.iso_3166_1] || "🏳️") : "🏳️"
    const options = [
      ...(selectedMovie ? [{ id: selectedMovie.id, title: selectedMovie.title, isCorrect: true }] : []),
      ...distractors.map(d => ({ id: d.id, title: d.title, isCorrect: false }))
    ].sort(() => Math.random() - 0.5)

    return {
      flagEmoji: flag,
      countryName: selectedTitle?.iso_3166_1 || "...",
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
          <h2 className="text-xl font-semibold mb-4">Create Retitled Puzzle</h2>
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
              onChange={(e) => setPuzzleDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="is-published">Status</Label>
            <div className="flex items-center gap-3 h-10 px-3 rounded-lg bg-gray-50 border border-gray-200">
              <Switch
                id="is-published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
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
          <Label>Original Movie</Label>
          {selectedMovie ? (
            <MovieDetailsCard 
              movie={selectedMovie}
              onRemove={() => {
                setSelectedMovie(null)
                setAlternativeTitles([])
                setSelectedTitle(null)
                setCustomTitle("")
                setEnglishTranslation("")
              }}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start"
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
                      key={idx} 
                      value={`${title.iso_3166_1}:${title.title}`}
                      className="hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{COUNTRY_FLAGS[title.iso_3166_1] || "🏳️"}</span>
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
              </div>
            )}
          </div>
        )}

        {/* Distractor Options */}
        {selectedMovie && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Wrong Answer Options ({distractors.length}/5)</Label>
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
                  onClick={shuffleDistractors}
                  disabled={distractors.length < 2}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {distractors.map((movie, index) => (
                <Card key={index} className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{movie.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDistractor(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {distractors.length < 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addDistractor}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wrong Answer
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={savePuzzle}
          disabled={loading || !selectedMovie || !selectedTitle || !customTitle.trim() || distractors.length < 3}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Puzzle
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
      {showMovieSelector && (
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
          <Card className="w-full max-w-2xl h-[80vh] flex flex-col relative">
            <button
              onClick={() => {
                setShowMovieSelector(false)
                setSelectingDistractorIndex(null)
              }}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-4">Select Movie</h3>
              <MovieSelector
                onSelect={handleSelectMovie}
                onClose={() => {
                  setShowMovieSelector(false)
                  setSelectingDistractorIndex(null)
                }}
                excludeIds={[
                  ...(selectedMovie ? [selectedMovie.id] : []),
                  ...distractors.map(d => d.id)
                ]}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}