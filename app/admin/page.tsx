"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Calendar,
  Film,
  TrendingUp,
  Users,
  DollarSign,
  Star,
  Clock,
  Clapperboard,
  Award,
  Puzzle,
  PenTool,
  Info,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  X
} from "lucide-react"
import { format } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TrendingMovie {
  id: number
  title: string
  poster_path: string
  release_date: string
  vote_average: number
  overview: string
  budget?: number
  revenue?: number
  runtime?: number
  genres?: { id: number; name: string }[]
  credits?: {
    crew: { job: string; name: string }[]
    cast: { name: string; character: string }[]
  }
}

export default function AdminDashboard() {
  const [trendingMovies, setTrendingMovies] = useState<TrendingMovie[]>([])
  const [selectedMovie, setSelectedMovie] = useState<TrendingMovie | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQuickGuide, setShowQuickGuide] = useState(true)

  useEffect(() => {
    fetchTrendingMovies()
  }, [])

  const fetchTrendingMovies = async () => {
    try {
      const response = await fetch("/api/movies/trending?time_window=week")
      if (response.ok) {
        const data = await response.json()
        setTrendingMovies(data.results || [])
      }
    } catch (error) {
      console.error("Error fetching trending movies:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMovieDetails = async (movieId: number) => {
    try {
      const response = await fetch(`/api/movies/${movieId}/details`)
      if (response.ok) {
        const data = await response.json()
        setSelectedMovie(data)
      }
    } catch (error) {
      console.error("Error fetching movie details:", error)
    }
  }

  const adminTools = [
    {
      title: "Puzzle Editor",
      description: "Create and manage puzzles for all games",
      icon: PenTool,
      href: "/admin/puzzle-editor",
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    },
    {
      title: "Movie Search",
      description: "Search and explore movie database",
      icon: Film,
      href: "/admin/movies",
      color: "bg-orange-50 text-orange-700 hover:bg-orange-100"
    },
    {
      title: "Puzzle Schedule",
      description: "View and manage puzzle calendar",
      icon: Calendar,
      href: "/admin/schedule",
      color: "bg-pink-50 text-pink-700 hover:bg-pink-100"
    },
    {
      title: "Analytics",
      description: "View game statistics and player data",
      icon: TrendingUp,
      href: "/admin/analytics",
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      {/* Quick Start Guide */}
      {showQuickGuide && (
        <Card className="mb-8 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-900">Admin Quick Start Guide</CardTitle>
              </div>
              <button
                onClick={() => setShowQuickGuide(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Getting Started
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                  <li>Visit <span className="font-mono bg-white px-1 rounded">Puzzle Editor</span> to create your first puzzle</li>
                  <li>Use <span className="font-mono bg-white px-1 rounded">Movie Search</span> to check movie availability</li>
                  <li>Schedule puzzles via <span className="font-mono bg-white px-1 rounded">Puzzle Schedule</span></li>
                  <li>Monitor performance in <span className="font-mono bg-white px-1 rounded">Analytics</span></li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Important Notes
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Puzzles must be marked as <strong>Published</strong> to appear to players</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Draft puzzles can be saved without dates for later scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>Movies recently used (last 30 days) show as <span className="text-cinema-red">●</span> unavailable</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>For detailed documentation, see</span>
                <code className="px-2 py-0.5 bg-white rounded text-xs">ADMIN_SETUP_COMPLETE.md</code>
              </div>
              <Link 
                href="/admin/puzzle-editor"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Create First Puzzle →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Admin Tools Bento Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {adminTools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className={`block p-6 rounded-lg border border-gray-200 transition-all hover:shadow-lg ${tool.color}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">{tool.title}</h3>
                <p className="text-sm opacity-80">{tool.description}</p>
              </div>
              <tool.icon className="w-8 h-8 opacity-80" />
            </div>
          </Link>
        ))}
      </div>

      {/* Trending Movies Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Trending Movies This Week</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg aspect-[2/3] mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingMovies.slice(0, 12).map((movie) => (
              <div
                key={movie.id}
                className="cursor-pointer group"
                onClick={() => fetchMovieDetails(movie.id)}
              >
                <div className="relative overflow-hidden rounded-lg shadow-md transition-transform group-hover:scale-105">
                  <img
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium">{movie.title}</p>
                      <p className="text-white/80 text-xs">{new Date(movie.release_date).getFullYear()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMovie(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <img
                  src={`https://image.tmdb.org/t/p/w342${selectedMovie.poster_path}`}
                  alt={selectedMovie.title}
                  className="w-48 rounded-lg shadow-md"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{selectedMovie.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>Release: {format(new Date(selectedMovie.release_date), "MMMM d, yyyy")}</span>
                    </div>
                    {selectedMovie.runtime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{selectedMovie.runtime} minutes</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{selectedMovie.vote_average.toFixed(1)}/10</span>
                    </div>
                    {selectedMovie.budget && selectedMovie.budget > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span>Budget: ${(selectedMovie.budget / 1000000).toFixed(1)}M</span>
                      </div>
                    )}
                    {selectedMovie.revenue && selectedMovie.revenue > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span>Revenue: ${(selectedMovie.revenue / 1000000).toFixed(1)}M</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedMovie.genres && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedMovie.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Overview</h4>
                  <p className="text-sm text-gray-600">{selectedMovie.overview}</p>
                </div>

                {selectedMovie.credits && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2">Director</h4>
                      <p className="text-sm text-gray-600">
                        {selectedMovie.credits.crew
                          .filter(c => c.job === "Director")
                          .map(d => d.name)
                          .join(", ") || "N/A"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Writers</h4>
                      <p className="text-sm text-gray-600">
                        {selectedMovie.credits.crew
                          .filter(c => c.job === "Screenplay" || c.job === "Writer")
                          .map(w => w.name)
                          .slice(0, 3)
                          .join(", ") || "N/A"}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Top Cast</h4>
                      <p className="text-sm text-gray-600">
                        {selectedMovie.credits.cast
                          .slice(0, 5)
                          .map(a => a.name)
                          .join(", ") || "N/A"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedMovie(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}