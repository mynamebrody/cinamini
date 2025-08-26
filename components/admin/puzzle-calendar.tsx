"use client"

import { useState, useEffect, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Calendar, Film, DollarSign, Users, Image, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

interface Puzzle {
  id: string
  puzzle_date: string | null
  film_title: string
  game_type: 'retitled' | 'budget_bracket' | 'cast_climb' | 'poster_pixels'
  difficulty_level?: number
  created_at: string
  pairs?: any // For Budget Bracket puzzles
  name?: string // Optional name for Budget Bracket puzzles
}

interface PuzzleCalendarProps {
  onDateClick: (date: Date) => void
  onPuzzleClick: (puzzle: Puzzle) => void
  onAddPuzzle: (date: Date) => void
}

const gameConfig = {
  retitled: {
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20",
    icon: Film,
    label: "Retitled"
  },
  budget_bracket: {
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20",
    icon: DollarSign,
    label: "Budget Bracket"
  },
  cast_climb: {
    color: "bg-violet-500/10 text-violet-600 border-violet-500/30 hover:bg-violet-500/20",
    icon: Users,
    label: "Cast Climb"
  },
  poster_pixels: {
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20",
    icon: Image,
    label: "Poster Pixels"
  }
}

function DraggablePuzzle({ puzzle, onPuzzleClick }: { puzzle: Puzzle; onPuzzleClick: (puzzle: Puzzle) => void }) {
  // Check if puzzle date is in the past or today (but allow drafts to be dragged)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const puzzleDate = puzzle.puzzle_date ? new Date(puzzle.puzzle_date) : null
  const isDraft = !puzzle.puzzle_date
  const isDraggingDisabled = puzzleDate && puzzleDate <= today

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${puzzle.game_type}-${puzzle.id}`,
    data: puzzle,
    disabled: isDraggingDisabled || false
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  }

  const config = gameConfig[puzzle.game_type]
  const Icon = config.icon

  // Get display text for Budget Bracket puzzles
  const getDisplayText = () => {
    if (puzzle.game_type === 'budget_bracket') {
      // If puzzle has a custom name, show it
      if (puzzle.name) {
        return puzzle.name
      }
      
      // Otherwise, use fallback logic to show first movie
      if (puzzle.pairs) {
        try {
          const pairs = typeof puzzle.pairs === 'string' ? JSON.parse(puzzle.pairs) : puzzle.pairs
          if (pairs && pairs.length > 0 && pairs[0].movies && pairs[0].movies.length > 0) {
            const firstMovie = pairs[0].movies[0].title
            return `R1A: ${firstMovie}`
          }
        } catch (error) {
          console.error('Error parsing Budget Bracket pairs:', error)
        }
      }
    }
    return puzzle.film_title
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-2 rounded-md border transition-all hover:scale-105 hover:shadow-sm relative group cursor-pointer",
        config.color,
        isDragging && "shadow-lg ring-2 ring-offset-2 ring-offset-background",
        isDraggingDisabled && "opacity-75 cursor-not-allowed",
        isDraft && "border-dashed border-2 bg-amber-50/50"
      )}
      onClick={() => {
        // Only handle click if not currently dragging
        if (!isDragging) {
          onPuzzleClick(puzzle)
        }
      }}
      title={isDraft ? "Click to edit • Hold to drag and schedule" : "Click to edit • Hold to drag and reschedule"}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="text-xs font-medium truncate">{getDisplayText()}</span>
      </div>
    </div>
  )
}

function DroppableDate({ date, puzzles, onAddPuzzle, onPuzzleClick }: { date: Date; puzzles: Puzzle[]; onAddPuzzle: () => void; onPuzzleClick: (puzzle: Puzzle) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
    data: { date }
  })

  // Check if this is a past date or today (not valid for dropping)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPastDate = date <= today

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] p-3 border rounded-lg transition-all relative group bg-card",
        isOver && !isPastDate && "bg-cinema-gold/20 border-cinema-red scale-[1.02] ring-2 ring-cinema-red/30",
        isOver && isPastDate && "bg-red-100/50 border-red-400 scale-[1.02]",
        !isSameMonth(date, new Date()) && "opacity-40 bg-muted/20",
        isSameDay(date, new Date()) && "border-primary bg-primary/5 ring-1 ring-primary/20",
        isPastDate && "cursor-not-allowed"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          "text-sm font-semibold",
          isSameDay(date, new Date()) && "text-primary",
          !isSameMonth(date, new Date()) && "text-muted-foreground"
        )}>
          {format(date, 'd')}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onAddPuzzle}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {puzzles.map(puzzle => (
          <DraggablePuzzle key={`${puzzle.game_type}-${puzzle.id}`} puzzle={puzzle} onPuzzleClick={onPuzzleClick} />
        ))}
      </div>
      {puzzles.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs text-muted-foreground/50">
            No puzzles
          </div>
        </div>
      )}
      
      {isOver && !isPastDate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-sm font-medium text-cinema-red bg-white/90 px-3 py-1 rounded-full shadow-md">
            Drop to schedule
          </div>
        </div>
      )}
      
      {isOver && isPastDate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-sm font-medium text-red-600 bg-white/90 px-3 py-1 rounded-full shadow-md">
            Cannot drop here
          </div>
        </div>
      )}
      {puzzles.length > 2 && !isOver && (
        <div className="absolute bottom-1 right-1">
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {puzzles.length}
          </Badge>
        </div>
      )}
    </div>
  )
}

export function PuzzleCalendar({ onPuzzleClick, onAddPuzzle }: Omit<PuzzleCalendarProps, 'onDateClick'>) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [puzzles, setPuzzles] = useState<{ scheduled: Puzzle[]; drafts: Puzzle[] }>({ scheduled: [], drafts: [] })
  const [draggedPuzzle, setDraggedPuzzle] = useState<Puzzle | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoScheduling, setAutoScheduling] = useState(false)

  // Configure drag sensor with activation delay for click-and-hold
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  )

  useEffect(() => {
    fetchPuzzles()
  }, [currentMonth])

  const fetchPuzzles = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      
      const response = await fetch(
        `/api/admin/puzzles/schedule?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setPuzzles(data)
      }
    } catch (error) {
      console.error('Error fetching puzzles:', error)
    } finally {
      setLoading(false)
    }
  }

  const autoScheduleDrafts = async () => {
    if (puzzles.drafts.length === 0) {
      alert('No draft puzzles available to schedule.')
      return
    }

    // Show confirmation dialog with preview
    const confirmMessage = `Auto Schedule will assign ${puzzles.drafts.length} draft puzzles to empty slots starting from tomorrow. This action can be undone by dragging puzzles back to drafts. Continue?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setAutoScheduling(true)
    
    try {
      // Generate date range starting from tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const endDate = new Date(tomorrow)
      endDate.setDate(endDate.getDate() + 60) // Look ahead 60 days
      
      // Get existing scheduled puzzles for the date range
      const response = await fetch(
        `/api/admin/puzzles/schedule?start=${format(tomorrow, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled puzzles')
      }
      
      const scheduledData = await response.json()
      const scheduledPuzzles = scheduledData.scheduled || []
      
      // Create a map of dates to game types that are already scheduled
      const scheduledGamesByDate = new Map<string, Set<string>>()
      scheduledPuzzles.forEach((puzzle: Puzzle) => {
        if (puzzle.puzzle_date) {
          const dateStr = puzzle.puzzle_date
          if (!scheduledGamesByDate.has(dateStr)) {
            scheduledGamesByDate.set(dateStr, new Set())
          }
          scheduledGamesByDate.get(dateStr)!.add(puzzle.game_type)
        }
      })
      
      // Group drafts by game type
      const draftsByGameType = puzzles.drafts.reduce((groups, draft) => {
        if (!groups[draft.game_type]) {
          groups[draft.game_type] = []
        }
        groups[draft.game_type].push(draft)
        return groups
      }, {} as Record<string, Puzzle[]>)
      
      // Generate assignments
      const assignments: Array<{ puzzleId: string; gameType: string; targetDate: string }> = []
      const gameTypePriority = ['retitled', 'budget_bracket', 'cast_climb', 'poster_pixels']
      
      // Track which drafts have been assigned
      const assignedDrafts = new Set<string>()
      
      // Iterate through dates starting from tomorrow
      for (let i = 0; i < 60 && assignments.length < puzzles.drafts.length; i++) {
        const currentDate = new Date(tomorrow)
        currentDate.setDate(currentDate.getDate() + i)
        const dateStr = format(currentDate, 'yyyy-MM-dd')
        
        const scheduledForDate = scheduledGamesByDate.get(dateStr) || new Set()
        
        // For each game type, check if there's an empty slot
        for (const gameType of gameTypePriority) {
          if (!scheduledForDate.has(gameType) && draftsByGameType[gameType]) {
            // Find the next unassigned draft of this type
            const availableDraft = draftsByGameType[gameType].find(draft => !assignedDrafts.has(draft.id))
            
            if (availableDraft) {
              assignments.push({
                puzzleId: availableDraft.id,
                gameType: availableDraft.game_type,
                targetDate: dateStr
              })
              assignedDrafts.add(availableDraft.id)
              scheduledForDate.add(gameType)
              
              // Stop if we've assigned all drafts
              if (assignments.length >= puzzles.drafts.length) {
                break
              }
            }
          }
        }
      }
      
      if (assignments.length === 0) {
        alert('No available slots found for scheduling. All dates may already have puzzles for each game type.')
        return
      }
      
      // Send assignments to API
      const autoScheduleResponse = await fetch('/api/admin/puzzles/auto-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments })
      })
      
      const result = await autoScheduleResponse.json()
      
      if (result.success) {
        alert(`Successfully scheduled ${result.stats.successful} puzzles!`)
        // Refresh the puzzles
        await fetchPuzzles()
      } else {
        const errorMessage = result.errors && result.errors.length > 0
          ? `Scheduled ${result.stats.successful} puzzles, but ${result.stats.failed} failed:\n${result.errors.map((e: any) => e.error).join('\n')}`
          : result.message || 'Some puzzles could not be scheduled'
        
        alert(errorMessage)
        
        // Still refresh if some succeeded
        if (result.stats.successful > 0) {
          await fetchPuzzles()
        }
      }
      
    } catch (error) {
      console.error('Error auto-scheduling puzzles:', error)
      alert('Failed to auto-schedule puzzles. Please try again.')
    } finally {
      setAutoScheduling(false)
    }
  }

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const startWeek = startOfWeek(currentMonth)
      const endWeek = endOfWeek(currentMonth)
      return eachDayOfInterval({ start: startWeek, end: endWeek })
    } else {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const startWeek = startOfWeek(start)
      const endWeek = endOfWeek(end)
      return eachDayOfInterval({ start: startWeek, end: endWeek })
    }
  }, [currentMonth, viewMode])

  const puzzlesByDate = useMemo(() => {
    const map = new Map<string, Puzzle[]>()
    
    puzzles.scheduled.forEach(puzzle => {
      if (puzzle.puzzle_date) {
        const dateKey = puzzle.puzzle_date
        if (!map.has(dateKey)) {
          map.set(dateKey, [])
        }
        map.get(dateKey)!.push(puzzle)
      }
    })
    
    return map
  }, [puzzles.scheduled])

  const handleDragStart = (event: any) => {
    setDraggedPuzzle(event.active.data.current)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { over } = event
    
    if (!over || !draggedPuzzle) {
      setDraggedPuzzle(null)
      return
    }

    // Check if we actually moved to a different date
    const newDate = over.data.current?.date
    if (!newDate) {
      setDraggedPuzzle(null)
      return
    }

    const formattedDate = format(newDate, 'yyyy-MM-dd')
    
    // Don't reschedule if dropping on the same date (but allow drafts to be scheduled)
    if (draggedPuzzle.puzzle_date === formattedDate) {
      setDraggedPuzzle(null)
      return
    }

    // Don't allow moving to past dates or today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newDate <= today) {
      alert("Cannot schedule puzzles for today or past dates")
      setDraggedPuzzle(null)
      return
    }
    
    try {
      // Check if this will be a draft publication (setting is_published to true)
      const isDraft = !draggedPuzzle.puzzle_date
      
      if (isDraft) {
        // Check if there's an existing puzzle of same type on this date
        const existingPuzzles = puzzlesByDate.get(formattedDate) || []
        const conflictingPuzzle = existingPuzzles.find(p => p.game_type === draggedPuzzle.game_type)
        
        if (conflictingPuzzle) {
          // Use reschedule endpoint for swapping draft with published puzzle
          const response = await fetch('/api/admin/puzzles/reschedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: draggedPuzzle.id,
              gameType: draggedPuzzle.game_type,
              newDate: formattedDate,
              isDraftSwap: true,
              existingPuzzleId: conflictingPuzzle.id
            })
          })

          if (response.ok) {
            const result = await response.json()
            // Show notification about the swap
            if (result.draftSwap) {
              alert(`Swapped! "${draggedPuzzle.film_title}" is now published for ${formattedDate}, and "${conflictingPuzzle.film_title}" has been moved to drafts.`)
            } else {
              alert(`Swapped! Puzzles have been exchanged successfully.`)
            }
            await fetchPuzzles()
          } else {
            const error = await response.json()
            console.error('Failed to swap draft with published puzzle:', error)
            alert(error.error || "Failed to swap puzzles")
          }
        } else {
          // No conflict, use regular update for draft publication
          // Remove fields that don't exist in the database schema
          const cleanPuzzleData = Object.fromEntries(
            Object.entries(draggedPuzzle).filter(([key]) => 
              !['game_type', 'id', 'created_at'].includes(key)
            )
          )
          
          const response = await fetch('/api/admin/puzzles/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: draggedPuzzle.id,
              gameType: draggedPuzzle.game_type,
              puzzleData: {
                ...cleanPuzzleData,
                puzzle_date: formattedDate,
                is_published: true
              }
            })
          })

          if (response.ok) {
            await fetchPuzzles()
          } else {
            const error = await response.json()
            console.error('Failed to publish draft:', error)
            alert(error.error || "Failed to publish draft")
          }
        }
      } else {
        // For existing scheduled puzzles, use the reschedule endpoint
        const response = await fetch('/api/admin/puzzles/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleId: draggedPuzzle.id,
            gameType: draggedPuzzle.game_type,
            newDate: formattedDate
          })
        })

        if (response.ok) {
          const result = await response.json()
          
          if (result.swapped) {
            // Show a notification about the swap
            alert(`Puzzles swapped! "${result.puzzle1.film_title}" moved to ${formattedDate}, "${result.puzzle2.film_title}" moved to ${result.puzzle2.puzzle_date}`)
          }
          
          await fetchPuzzles()
        } else {
          const error = await response.json()
          console.error('Failed to reschedule puzzle:', error)
          alert(error.error || "Failed to reschedule puzzle")
        }
      }
    } catch (error) {
      console.error('Error handling drag end:', error)
      alert("Failed to move puzzle")
    }
    
    setDraggedPuzzle(null)
  }

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentMonth(subWeeks(currentMonth, 1))
    } else {
      setCurrentMonth(subMonths(currentMonth, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentMonth(addWeeks(currentMonth, 1))
    } else {
      setCurrentMonth(addMonths(currentMonth, 1))
    }
  }

  const getHeaderTitle = () => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentMonth)
      const weekEnd = endOfWeek(currentMonth)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    } else {
      return format(currentMonth, 'MMMM yyyy')
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            {getHeaderTitle()}
          </h2>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex border rounded-md p-1">
              <Button
                variant={viewMode === 'month' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode('month')}
                className="px-3 py-1 text-xs"
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode('week')}
                className="px-3 py-1 text-xs"
              >
                Week
              </Button>
            </div>
            
            {/* Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
          
          {loading ? (
            // Loading skeleton
            <>
              {[...Array(35)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="min-h-[120px] p-3 border rounded-lg bg-card animate-pulse"
                >
                  <div className="h-4 w-8 bg-muted rounded mb-2" />
                  <div className="space-y-2">
                    <div className="h-8 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <AnimatePresence>
              {days.map((day, index) => (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.01 }}
                >
                  <DroppableDate
                    date={day}
                    puzzles={puzzlesByDate.get(format(day, 'yyyy-MM-dd')) || []}
                    onAddPuzzle={() => onAddPuzzle(day)}
                    onPuzzleClick={onPuzzleClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="outline" className="bg-background">
                <Film className="w-3 h-3 mr-1" />
                Drafts
              </Badge>
              <span className="text-sm text-muted-foreground">
                {puzzles.drafts.length} unpublished • Hold to drag and schedule
              </span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={autoScheduleDrafts}
              disabled={puzzles.drafts.length === 0 || autoScheduling}
              className="flex items-center gap-1.5 text-xs border-cinema-red/30 text-cinema-red hover:bg-cinema-red hover:text-white hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29)] hover:-translate-y-0.5 transition-all duration-200"
            >
              {autoScheduling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Auto Schedule
            </Button>
          </div>
          
          <ScrollArea className="h-[250px] pr-3">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={`draft-skeleton-${i}`} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {puzzles.drafts.length > 0 ? (
                  // Group drafts by game type
                  Object.entries(
                    puzzles.drafts.reduce((groups, puzzle) => {
                      const type = puzzle.game_type
                      if (!groups[type]) groups[type] = []
                      groups[type].push(puzzle)
                      return groups
                    }, {} as Record<string, Puzzle[]>)
                  ).map(([gameType, puzzlesInType]) => (
                    <div key={`draft-group-${gameType}`} className="space-y-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        {(() => {
                          const Icon = gameConfig[gameType as keyof typeof gameConfig]?.icon || Film
                          return <Icon className="w-3 h-3" />
                        })()} 
                        <span className="text-xs font-medium text-muted-foreground">
                          {gameConfig[gameType as keyof typeof gameConfig]?.label || gameType}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {puzzlesInType.length}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {puzzlesInType.map((puzzle) => (
                          <motion.div
                            key={`${puzzle.game_type}-${puzzle.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <DraggablePuzzle puzzle={puzzle} onPuzzleClick={onPuzzleClick} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Film className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No draft puzzles available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create new puzzles to schedule them
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      <DragOverlay>
        {draggedPuzzle && (
          <motion.div
            initial={{ scale: 1.05, rotate: 2 }}
            animate={{ scale: 1.1, rotate: 5 }}
            className={cn(
              "p-3 rounded-lg border-2 shadow-2xl backdrop-blur-sm",
              gameConfig[draggedPuzzle.game_type].color,
              "ring-2 ring-offset-2 ring-offset-background"
            )}
          >
            <div className="flex items-center gap-2">
              {gameConfig[draggedPuzzle.game_type].icon && (() => {
                const Icon = gameConfig[draggedPuzzle.game_type].icon
                return <Icon className="w-4 h-4" />
              })()}
              <span className="text-sm font-medium">{draggedPuzzle.film_title}</span>
            </div>
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  )
}