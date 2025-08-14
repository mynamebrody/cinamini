"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarDays, AlertCircle, TrendingUp, Package } from "lucide-react"
import { PuzzleCalendar } from "@/components/admin/puzzle-calendar"
import { PuzzleDetailDialog } from "@/components/admin/puzzle-detail-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

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
  }, [])

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
        const data = await response.json()
        setSelectedDatePuzzles(data.scheduled)
        setShowPuzzleDetail(true)
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
    // Navigate to create puzzle page with date pre-selected
    const dateStr = format(date, 'yyyy-MM-dd')
    router.push(`/admin/puzzles/create?date=${dateStr}`)
  }

  const handlePuzzleClick = (puzzle: Puzzle) => {
    // Navigate to edit puzzle page
    router.push(`/admin/puzzles/${puzzle.game_type}/${puzzle.id}`)
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
        <Card className="admin-card relative overflow-hidden">
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
        
        <Card className="admin-card relative overflow-hidden">
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
        
        <Card className="admin-card relative overflow-hidden">
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

      <Card className="admin-card">
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