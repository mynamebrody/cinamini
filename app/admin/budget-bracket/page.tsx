"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Calendar,
  Plus,
  Search,
  Trash2,
  Save,
  Edit,
  X,
  Film,
  DollarSign
} from "lucide-react"
import { format } from "date-fns"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  budget?: number
}

interface MoviePair {
  movieA: Movie | null
  movieB: Movie | null
}

interface BudgetBracketPuzzle {
  id: string
  puzzle_date: string
  movie_pairs: MoviePair[]
  created_at: string
  is_published: boolean
}

export default function BudgetBracketEditor() {
  const [puzzles, setPuzzles] = useState<BudgetBracketPuzzle[]>([])
  const [selectedDate, setSelectedDate] = useState("")
  const [moviePairs, setMoviePairs] = useState<MoviePair[]>(Array(8).fill({ movieA: null, movieB: null }))
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<"A" | "B" | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingPuzzle, setEditingPuzzle] = useState<BudgetBracketPuzzle | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchPuzzles()
  }, [])

  const fetchPuzzles = async () => {
    const { data } = await supabase
      .from('budget_bracket_puzzles')
      .select('*')
      .order('puzzle_date', { ascending: false })
      .limit(30)

    if (data) {
      setPuzzles(data)
    }
  }

  const searchMovies = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/movies/search?query=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        // Fetch budget data for each movie
        const moviesWithBudgets = await Promise.all(
          data.results.slice(0, 10).map(async (movie: Movie) => {
            try {
              const detailsResponse = await fetch(`/api/movies/${movie.id}/details`)
              if (detailsResponse.ok) {
                const details = await detailsResponse.json()
                return { ...movie, budget: details.budget }
              }
            } catch (error) {
              console.error(`Error fetching details for movie ${movie.id}:`, error)
            }
            return movie
          })
        )
        setSearchResults(moviesWithBudgets)
      }
    } catch (error) {
      console.error("Error searching movies:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectMovie = (movie: Movie) => {
    if (selectedPairIndex !== null && selectedSlot) {
      const newPairs = [...moviePairs]
      newPairs[selectedPairIndex] = {
        ...newPairs[selectedPairIndex],
        [`movie${selectedSlot}`]: movie
      }
      setMoviePairs(newPairs)
      setSelectedPairIndex(null)
      setSelectedSlot(null)
      setSearchQuery("")
      setSearchResults([])
    }
  }

  const removePair = (index: number) => {
    const newPairs = [...moviePairs]
    newPairs[index] = { movieA: null, movieB: null }
    setMoviePairs(newPairs)
  }

  const savePuzzle = async () => {
    if (!selectedDate) {
      alert("Please select a date for the puzzle")
      return
    }

    const validPairs = moviePairs.filter(pair => pair.movieA && pair.movieB)
    if (validPairs.length !== 8) {
      alert("Please complete all 8 movie pairs")
      return
    }

    try {
      const puzzleData = {
        puzzle_date: selectedDate,
        movie_pairs: validPairs.map(pair => ({
          movieA: {
            tmdb_id: pair.movieA!.id,
            title: pair.movieA!.title,
            poster_path: pair.movieA!.poster_path,
            budget: pair.movieA!.budget || 0
          },
          movieB: {
            tmdb_id: pair.movieB!.id,
            title: pair.movieB!.title,
            poster_path: pair.movieB!.poster_path,
            budget: pair.movieB!.budget || 0
          }
        }))
      }

      if (editingPuzzle) {
        const { error } = await supabase
          .from('budget_bracket_puzzles')
          .update(puzzleData)
          .eq('id', editingPuzzle.id)

        if (!error) {
          alert("Puzzle updated successfully!")
          setEditingPuzzle(null)
        }
      } else {
        const { error } = await supabase
          .from('budget_bracket_puzzles')
          .insert(puzzleData)

        if (!error) {
          alert("Puzzle created successfully!")
        }
      }

      // Reset form
      setSelectedDate("")
      setMoviePairs(Array(8).fill({ movieA: null, movieB: null }))
      fetchPuzzles()
    } catch (error) {
      console.error("Error saving puzzle:", error)
      alert("Failed to save puzzle")
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Budget Bracket Editor</h1>

      {/* Puzzle Creation Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingPuzzle ? "Edit Puzzle" : "Create New Puzzle"}
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Puzzle Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Movie Pairs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {moviePairs.map((pair, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Pair {index + 1}</h3>
                <button
                  onClick={() => removePair(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Movie A */}
                <div
                  onClick={() => {
                    setSelectedPairIndex(index)
                    setSelectedSlot("A")
                  }}
                  className={`cursor-pointer border-2 rounded-lg p-2 transition-colors ${
                    selectedPairIndex === index && selectedSlot === "A"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {pair.movieA ? (
                    <div>
                      {pair.movieA.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${pair.movieA.poster_path}`}
                          alt={pair.movieA.title}
                          className="w-full rounded mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gray-200 rounded mb-2 flex items-center justify-center">
                          <Film className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <p className="text-xs font-medium line-clamp-2">{pair.movieA.title}</p>
                      {pair.movieA.budget && (
                        <p className="text-xs text-gray-500 mt-1">
                          ${(pair.movieA.budget / 1000000).toFixed(1)}M
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 rounded flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Movie B */}
                <div
                  onClick={() => {
                    setSelectedPairIndex(index)
                    setSelectedSlot("B")
                  }}
                  className={`cursor-pointer border-2 rounded-lg p-2 transition-colors ${
                    selectedPairIndex === index && selectedSlot === "B"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {pair.movieB ? (
                    <div>
                      {pair.movieB.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${pair.movieB.poster_path}`}
                          alt={pair.movieB.title}
                          className="w-full rounded mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gray-200 rounded mb-2 flex items-center justify-center">
                          <Film className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <p className="text-xs font-medium line-clamp-2">{pair.movieB.title}</p>
                      {pair.movieB.budget && (
                        <p className="text-xs text-gray-500 mt-1">
                          ${(pair.movieB.budget / 1000000).toFixed(1)}M
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 rounded flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          {editingPuzzle && (
            <button
              onClick={() => {
                setEditingPuzzle(null)
                setSelectedDate("")
                setMoviePairs(Array(8).fill({ movieA: null, movieB: null }))
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={savePuzzle}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {editingPuzzle ? "Update Puzzle" : "Save Puzzle"}
          </button>
        </div>
      </div>

      {/* Movie Search Panel */}
      {selectedPairIndex !== null && selectedSlot && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg p-6 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Select Movie</h3>
            <button
              onClick={() => {
                setSelectedPairIndex(null)
                setSelectedSlot(null)
                setSearchQuery("")
                setSearchResults([])
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchMovies()}
              placeholder="Search movies..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={searchMovies}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-20 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => selectMovie(movie)}
                  className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200"
                >
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt={movie.title}
                      className="w-16 h-24 rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                      <Film className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{movie.title}</h4>
                    <p className="text-xs text-gray-500">
                      {new Date(movie.release_date).getFullYear()}
                    </p>
                    {movie.budget && movie.budget > 0 && (
                      <p className="text-sm font-medium text-green-600 mt-1">
                        ${(movie.budget / 1000000).toFixed(1)}M
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Puzzles */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Puzzles</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {puzzles.map((puzzle) => (
                <tr key={puzzle.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(puzzle.puzzle_date), "MMM d, yyyy")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      puzzle.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {puzzle.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(puzzle.created_at), "MMM d, h:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingPuzzle(puzzle)
                        setSelectedDate(puzzle.puzzle_date)
                        setMoviePairs(puzzle.movie_pairs)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}