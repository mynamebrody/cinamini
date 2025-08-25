"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Cookies from "js-cookie"
import GameSelectorMenu from "@/components/admin/shared/game-selector-menu"
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
  const [showGameSelector, setShowGameSelector] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showQuickGuide, setShowQuickGuide] = useState(false) // Default to false, will be set by useEffect

  useEffect(() => {
    // Check if user has dismissed the guide before
    const hasSeenGuide = Cookies.get('admin-guide-dismissed')
    if (!hasSeenGuide) {
      setShowQuickGuide(true)
    }
  }, [])

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
      title: "Schedule",
      description: "View and manage puzzle calendar",
      icon: Calendar,
      href: "/admin/schedule",
      color: "bg-pink-50 text-pink-700 hover:bg-pink-100"
    },
    {
      title: "Puzzle Editor",
      description: "Create and manage puzzles for all games",
      icon: PenTool,
      href: "/admin/puzzle-editor",
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    },
    {
      title: "Analytics",
      description: "View game statistics and player data",
      icon: TrendingUp,
      href: "/admin/analytics",
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
    },
    {
      title: "Movie Search",
      description: "Search and explore movie database",
      icon: Film,
      href: "/admin/movies",
      color: "bg-orange-50 text-orange-700 hover:bg-orange-100"
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-funnel-display-bold text-neutral-900 mb-8">Admin Dashboard</h1>
      
      {/* Quick Start Guide */}
      {showQuickGuide && (
        <Card className="mb-8 admin-card border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-900 font-funnel-display-bold">Admin Quick Start Guide</CardTitle>
              </div>
              <button
                onClick={() => {
                  setShowQuickGuide(false)
                  Cookies.set('admin-guide-dismissed', 'true', { expires: 365 }) // Expires in 1 year
                }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2 font-funnel">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Getting Started
                </h3>
                <ol className="space-y-2 text-sm text-neutral-700 list-decimal list-inside font-funnel">
                  <li>Visit <span className="font-mono bg-white px-2 py-0.5 border border-neutral-200">Puzzle Editor</span> to create your first puzzle</li>
                  <li>Use <span className="font-mono bg-white px-2 py-0.5 border border-neutral-200">Movie Search</span> to check movie availability</li>
                  <li>Schedule puzzles via <span className="font-mono bg-white px-2 py-0.5 border border-neutral-200">Puzzle Schedule</span></li>
                  <li>Monitor performance in <span className="font-mono bg-white px-2 py-0.5 border border-neutral-200">Analytics</span></li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2 font-funnel">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Important Notes
                </h3>
                <ul className="space-y-2 text-sm text-neutral-700 font-funnel">
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
            
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
              <div className="flex items-center gap-2 text-sm text-neutral-600 font-funnel">
                <BookOpen className="w-4 h-4" />
                <span>For detailed documentation, see</span>
                <code className="px-2 py-0.5 bg-white border border-neutral-200 text-xs">ADMIN_SETUP_COMPLETE.md</code>
              </div>
              <Link 
                href="/admin/puzzle-editor"
                className="admin-btn-primary text-sm"
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
            className="admin-card block p-6 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-funnel-display-bold mb-2 text-neutral-900">{tool.title}</h3>
                <p className="text-sm text-neutral-600 font-funnel">{tool.description}</p>
              </div>
              <tool.icon className="w-8 h-8 text-cinema-red opacity-80" />
            </div>
          </Link>
        ))}
      </div>

      {/* Trending Movies Section */}
      <div>
        <h2 className="text-2xl font-funnel-display-bold text-neutral-900 mb-6">Trending Movies This Week</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-neutral-200 aspect-[2/3] mb-2"></div>
                <div className="bg-neutral-200 h-4 w-3/4"></div>
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
                <div className="admin-movie-poster relative overflow-hidden group-hover:scale-[1.02]">
                  <img
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium font-funnel">{movie.title}</p>
                      <p className="text-white/80 text-xs font-funnel">{new Date(movie.release_date).getFullYear()}</p>
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
            className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto admin-modal-silver animate-scale-in relative"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: 0 }}
          >
            {/* Close button in corner */}
            <button
              onClick={() => setSelectedMovie(null)}
              className="admin-modal-ghost-close absolute top-4 right-4 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 pr-12"> {/* Add right padding for close button */}
              <div className="flex gap-6 mb-6">
                <img
                  src={`https://image.tmdb.org/t/p/w342${selectedMovie.poster_path}`}
                  alt={selectedMovie.title}
                  className="w-48 border-2 border-neutral-200"
                  style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.1)' }}
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-funnel-display-bold mb-2 text-neutral-900">{selectedMovie.title}</h3>
                  <div className="space-y-2 text-sm font-funnel">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span>Release: {format(new Date(selectedMovie.release_date), "MMMM d, yyyy")}</span>
                    </div>
                    {selectedMovie.runtime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <span>{selectedMovie.runtime} minutes</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>{selectedMovie.vote_average.toFixed(1)}/10</span>
                    </div>
                    {selectedMovie.budget && selectedMovie.budget > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-neutral-500" />
                        <span>Budget: ${(selectedMovie.budget / 1000000).toFixed(1)}M</span>
                      </div>
                    )}
                    {selectedMovie.revenue && selectedMovie.revenue > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-neutral-500" />
                        <span>Revenue: ${(selectedMovie.revenue / 1000000).toFixed(1)}M</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedMovie.genres && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedMovie.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="admin-badge admin-badge-default text-xs"
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
                  <h4 className="font-semibold mb-2 font-funnel-display-bold text-neutral-900">Overview</h4>
                  <p className="text-sm text-neutral-600 font-funnel">{selectedMovie.overview}</p>
                </div>

                {selectedMovie.credits && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2 font-funnel-display-bold text-neutral-900">Director</h4>
                      <p className="text-sm text-neutral-600 font-funnel">
                        {selectedMovie.credits.crew
                          .filter(c => c.job === "Director")
                          .map(d => d.name)
                          .join(", ") || "N/A"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2 font-funnel-display-bold text-neutral-900">Writers</h4>
                      <p className="text-sm text-neutral-600 font-funnel">
                        {selectedMovie.credits.crew
                          .filter(c => c.job === "Screenplay" || c.job === "Writer")
                          .map(w => w.name)
                          .slice(0, 3)
                          .join(", ") || "N/A"}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 font-funnel-display-bold text-neutral-900">Top Cast</h4>
                      <p className="text-sm text-neutral-600 font-funnel">
                        {selectedMovie.credits.cast
                          .slice(0, 5)
                          .map(a => a.name)
                          .join(", ") || "N/A"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Add to Puzzle button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowGameSelector(true)
                  }}
                  className="admin-btn-puzzle"
                >
                  Add to Puzzle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Selector Modal */}
      {showGameSelector && selectedMovie && (
        <GameSelectorMenu
          movie={{
            id: selectedMovie.id,
            title: selectedMovie.title,
            poster_path: selectedMovie.poster_path,
            release_date: selectedMovie.release_date
          }}
          onClose={() => {
            setShowGameSelector(false)
            setSelectedMovie(null)
          }}
        />
      )}
    </div>
  )
}