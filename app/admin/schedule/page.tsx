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
  game_type: 'retitled' | 'budget_bracket' | 'cast_climb'
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
      cast_climb: 0
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
          cast_climb: 0
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="w-8 h-8" />
            Puzzle Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and schedule puzzles across all games
          </p>
        </div>
        
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Total Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScheduled}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Draft Puzzles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.totalDrafts}</div>
            <p className="text-xs text-muted-foreground">Ready to schedule</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Game Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Retitled</span>
                <Badge 
                  variant="outline" 
                  className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30"
                >
                  {stats.gamesWithPuzzles.retitled}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Budget Bracket</span>
                <Badge 
                  variant="outline" 
                  className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  {stats.gamesWithPuzzles.budget_bracket}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Cast Climb</span>
                <Badge 
                  variant="outline" 
                  className="text-xs bg-violet-500/10 text-violet-600 border-violet-500/30"
                >
                  {stats.gamesWithPuzzles.cast_climb}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>

      {drafts.length > 5 && (
        <Alert className="border-amber-500/50 bg-amber-50/50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-semibold">{drafts.length} draft puzzles</span> are waiting to be scheduled. 
            Use the bulk schedule feature to quickly assign dates to multiple puzzles.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
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