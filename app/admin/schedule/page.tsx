"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarDays, AlertCircle, TrendingUp, Package, Film, DollarSign, Gamepad2, ImageIcon } from "lucide-react"
import { PuzzleCalendar } from "@/components/admin/puzzle-calendar"
import { PuzzleDetailDialog } from "@/components/admin/puzzle-detail-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getGameStyle } from "@/lib/game-styles"

interface Puzzle {
  id: string
  puzzle_date: string | null
  film_title: string
  game_type: 'retitled' | 'budget_bracket' | 'cast_climb' | 'poster_pixels'
  difficulty_level?: number
  created_at: string
  [key: string]: any
}

export default function SchedulePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDatePuzzles, setSelectedDatePuzzles] = useState<Puzzle[]>([])
  const [showPuzzleDetail, setShowPuzzleDetail] = useState(false)
  const [gameMenuDate, setGameMenuDate] = useState<Date | null>(null)
  const [scheduledGames, setScheduledGames] = useState<Map<string, Set<string>>>(new Map())
  const [drafts, setDrafts] = useState<Puzzle[]>([])
  const [stats, setStats] = useState({
    totalScheduled: 0,
    totalDrafts: 0,
    gamesWithPuzzles: {
      retitled: 0,
      budget_bracket: 0,
      cast_climb: 0,
      poster_pixels: 0
    }
  })

  useEffect(() => {
    fetchStats()
    updateScheduledGames()
  }, [])

  const updateScheduledGames = async () => {
    try {
      // Fetch all scheduled puzzles for the current month
      const start = new Date()
      start.setDate(1)
      const end = new Date()
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)

      const response = await fetch(
        `/api/admin/puzzles/schedule?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const puzzles = data.scheduled || []
      
      const gamesByDate = new Map<string, Set<string>>()
      puzzles.forEach((puzzle: Puzzle) => {
        if (puzzle.puzzle_date) {
          const dateStr = puzzle.puzzle_date
          if (!gamesByDate.has(dateStr)) {
            gamesByDate.set(dateStr, new Set())
          }
          gamesByDate.get(dateStr)!.add(puzzle.game_type)
        }
      })
      
      setScheduledGames(gamesByDate)
    } catch (error) {
      console.error('Failed to fetch scheduled games:', error)
    }
  }

  const fetchStats = async () => {
    try {
      // Fetch current month's puzzles to get stats
      const start = new Date()
      start.setDate(1)
      const end = new Date()
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)

      const response = await fetch(
        `/api/admin/puzzles/schedule?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.drafts)
        
        // Calculate stats
        const gamesWithPuzzles = {
          retitled: 0,
          budget_bracket: 0,
          cast_climb: 0,
          poster_pixels: 0
        }
        
        data.scheduled.forEach((puzzle: Puzzle) => {
          gamesWithPuzzles[puzzle.game_type]++
        })
        
        setStats({
          totalScheduled: data.scheduled.length,
          totalDrafts: data.drafts.length,
          gamesWithPuzzles
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date)
    
    // Fetch puzzles for this specific date
    const dateStr = format(date, 'yyyy-MM-dd')
    
    try {
      const response = await fetch(
        `/api/admin/puzzles/schedule?start=${dateStr}&end=${dateStr}`
      )
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          setSelectedDatePuzzles(data.scheduled || [])
          setShowPuzzleDetail(true)
        } else {
          console.error('API returned non-JSON response:', await response.text())
          toast({
            title: "Error",
            description: "Server returned invalid response format",
            variant: "destructive"
          })
        }
      } else {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        toast({
          title: "Error",
          description: `Failed to fetch puzzles: ${response.status}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching date puzzles:', error)
      toast({
        title: "Error",
        description: "Failed to fetch puzzles for this date",
        variant: "destructive"
      })
    }
  }

  const handleAddPuzzle = (date: Date) => {
    // Store the date for the game menu
    setGameMenuDate(date)
  }

  const handleGameSelect = (gameType: string, movieId?: string) => {
    if (!gameMenuDate) return
    
    const dateStr = format(gameMenuDate, 'yyyy-MM-dd')
    const url = movieId 
      ? `/admin/puzzle-editor?date=${dateStr}&gameType=${gameType}&movieId=${movieId}`
      : `/admin/puzzle-editor?date=${dateStr}&gameType=${gameType}`
    
    router.push(url)
    setGameMenuDate(null) // Close menu
  }

  const getAvailableGames = (date: Date): Array<{id: string, name: string, icon: any}> => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const scheduledForDate = scheduledGames.get(dateStr) || new Set()
    
    const allGames = [
      { id: 'retitled', name: 'Retitled', icon: Film },
      { id: 'cast-climb', name: 'Cast Climb', icon: Gamepad2 },
      { id: 'budget-bracket', name: 'Budget Bracket', icon: DollarSign },
      { id: 'poster-pixels', name: 'Poster Pixels', icon: ImageIcon }
    ]
    
    return allGames.filter(game => !scheduledForDate.has(game.id))
  }

  const handlePuzzleClick = (puzzle: Puzzle) => {
    // Set the puzzle as selected and show the detail dialog
    setSelectedDatePuzzles([puzzle])
    setSelectedDate(puzzle.puzzle_date ? new Date(puzzle.puzzle_date) : new Date())
    setShowPuzzleDetail(true)
  }

  const handleCalendarUpdate = () => {
    // Refresh stats and calendar
    fetchStats()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-funnel-display-bold text-neutral-900 flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-cinema-red" />
            Puzzle Schedule
          </h1>
          <p className="text-neutral-600 mt-1 font-funnel">
            Manage and schedule puzzles across all games
          </p>
        </div>
        
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="admin-card-static relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cinema-red/10" style={{borderRadius: 0}} />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium font-funnel flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cinema-red" />
              Total Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-funnel-display-bold text-neutral-900">{stats.totalScheduled}</div>
            <p className="text-xs text-neutral-600 font-funnel">This month</p>
          </CardContent>
        </Card>
        
        <Card className="admin-card-static relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10" style={{borderRadius: 0}} />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium font-funnel flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Draft Puzzles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-funnel-display-bold text-amber-600">{stats.totalDrafts}</div>
            <p className="text-xs text-neutral-600 font-funnel">Ready to schedule</p>
          </CardContent>
        </Card>
        
        <Card className="admin-card-static relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10" style={{borderRadius: 0}} />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium font-funnel flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Game Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium font-funnel">Retitled</span>
                <span className="admin-badge admin-badge-default text-xs">
                  {stats.gamesWithPuzzles.retitled}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium font-funnel">Budget Bracket</span>
                <span className="admin-badge admin-badge-success text-xs">
                  {stats.gamesWithPuzzles.budget_bracket}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium font-funnel">Cast Climb</span>
                <span className="admin-badge admin-badge-default text-xs">
                  {stats.gamesWithPuzzles.cast_climb}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium font-funnel">Poster Pixels</span>
                <span className="admin-badge admin-badge-default text-xs">
                  {stats.gamesWithPuzzles.poster_pixels}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>

      {drafts.length > 5 && (
        <Alert className="admin-alert admin-alert-warning">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 font-funnel">
            <span className="font-semibold">{drafts.length} draft puzzles</span> are waiting to be scheduled. 
            Use the bulk schedule feature to quickly assign dates to multiple puzzles.
          </AlertDescription>
        </Alert>
      )}

      <Card className="admin-card-static">
        <CardHeader>
          <CardTitle className="font-funnel-display-bold text-neutral-900">Calendar View</CardTitle>
          <CardDescription className="font-funnel text-neutral-600">
            Click on any date to view or edit scheduled puzzles. Drag and drop puzzles to reschedule them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PuzzleCalendar
            onDateClick={handleDateClick}
            onPuzzleClick={handlePuzzleClick}
            onAddPuzzle={handleAddPuzzle}
          />
          
          {/* Game Selection Menu */}
          {gameMenuDate && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-none admin-modal-silver p-6 max-w-sm w-full mx-4">
                <h3 className="font-funnel-display-bold text-lg mb-4">Create Puzzle for {gameMenuDate && format(gameMenuDate, 'MMM d, yyyy')}</h3>
                <p className="text-sm text-neutral-600 mb-4">Select a game type:</p>
                <div className="space-y-2">
                  {getAvailableGames(gameMenuDate).map((game) => {
                    const Icon = game.icon
                    const styleColors = getGameStyle(game.id)
                    return (
                      <button
                        key={game.id}
                        onClick={() => handleGameSelect(game.id)}
                        className="admin-game-btn"
                        style={{
                          backgroundColor: styleColors.lightBgRgba,
                          borderColor: styleColors.borderRgba,
                          color: styleColors.textHex
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: styleColors.textHex }} />
                        <span className="font-funnel font-medium" style={{ color: styleColors.textHex }}>{game.name}</span>
                      </button>
                    )
                  })}
                </div>
                {getAvailableGames(gameMenuDate).length === 0 && (
                  <p className="text-sm text-neutral-500 text-center py-4">All games already scheduled for this date.</p>
                )}
                <button
                  onClick={() => setGameMenuDate(null)}
                  className="admin-cancel-btn text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      <PuzzleDetailDialog
        open={showPuzzleDetail}
        onOpenChange={setShowPuzzleDetail}
        puzzles={selectedDatePuzzles}
        date={selectedDate}
        onUpdate={() => {
          fetchStats()
          handleCalendarUpdate()
        }}
      />
    </div>
  )
}