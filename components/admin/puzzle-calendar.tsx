"use client"

import { useState, useEffect, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Calendar, Film, DollarSign, Users, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

interface Puzzle {
  id: string
  puzzle_date: string | null
  film_title: string
  game_type: 'retitled' | 'budget_bracket' | 'cast_climb' | 'poster_pixels'
  difficulty_level?: number
  created_at: string
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
  // Check if puzzle date is in the past or today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const puzzleDate = puzzle.puzzle_date ? new Date(puzzle.puzzle_date) : null
  const isDraggingDisabled = !puzzleDate || puzzleDate <= today

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${puzzle.game_type}-${puzzle.id}`,
    data: puzzle,
    disabled: isDraggingDisabled
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  }

  const config = gameConfig[puzzle.game_type]
  const Icon = config.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 rounded-md border transition-all hover:scale-105 hover:shadow-sm relative group",
        config.color,
        isDragging && "shadow-lg ring-2 ring-offset-2 ring-offset-background",
        isDraggingDisabled && "opacity-75"
      )}
    >
      <div 
        className="flex items-center gap-1.5 cursor-pointer"
        onClick={() => onPuzzleClick(puzzle)}
      >
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="text-xs font-medium truncate">{puzzle.film_title}</span>
      </div>
      {!isDraggingDisabled && (
        <div 
          {...listeners}
          {...attributes}
          className="absolute -inset-1 cursor-move opacity-0 hover:opacity-100 bg-black/5 rounded-md flex items-center justify-center"
          title="Drag to reschedule"
        >
          <div className="w-4 h-4 bg-white/80 rounded shadow-sm flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
              <path d="M10 3v18M14 3v18M5 8l14 0M5 16l14 0"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

function DroppableDate({ date, puzzles, onAddPuzzle, onPuzzleClick }: { date: Date; puzzles: Puzzle[]; onAddPuzzle: () => void; onPuzzleClick: (puzzle: Puzzle) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
    data: { date }
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] p-3 border rounded-lg transition-all relative group bg-card",
        isOver && "bg-accent/20 border-accent scale-[1.02]",
        !isSameMonth(date, new Date()) && "opacity-40 bg-muted/20",
        isSameDay(date, new Date()) && "border-primary bg-primary/5 ring-1 ring-primary/20"
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
      {puzzles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs text-muted-foreground/50">
            No puzzles
          </div>
        </div>
      )}
      {puzzles.length > 2 && (
        <div className="absolute bottom-1 right-1">
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {puzzles.length}
          </Badge>
        </div>
      )}
    </div>
  )
}

export function PuzzleCalendar({ onDateClick, onPuzzleClick, onAddPuzzle }: PuzzleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [puzzles, setPuzzles] = useState<{ scheduled: Puzzle[]; drafts: Puzzle[] }>({ scheduled: [], drafts: [] })
  const [draggedPuzzle, setDraggedPuzzle] = useState<Puzzle | null>(null)
  const [loading, setLoading] = useState(true)

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

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const startWeek = startOfWeek(start)
    const endWeek = endOfWeek(end)
    
    return eachDayOfInterval({ start: startWeek, end: endWeek })
  }, [currentMonth])

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
    const { active, over } = event
    
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
    
    // Don't reschedule if dropping on the same date
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
        await fetchPuzzles()
      } else {
        const error = await response.json()
        if (response.status === 409) {
          alert("A puzzle already exists on that date for this game")
        } else {
          console.error('Failed to reschedule puzzle:', error)
          alert(error.error || "Failed to reschedule puzzle")
        }
      }
    } catch (error) {
      console.error('Error rescheduling puzzle:', error)
      alert("Failed to reschedule puzzle")
    }
    
    setDraggedPuzzle(null)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
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
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
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
                  key={index}
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
            <AnimatePresence mode="wait">
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
                {puzzles.drafts.length} unpublished
              </span>
            </h3>
          </div>
          
          <ScrollArea className="h-[250px] pr-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-10 bg-muted rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {puzzles.drafts.length > 0 ? (
                  puzzles.drafts.map((puzzle) => (
                    <motion.div
                      key={`${puzzle.game_type}-${puzzle.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DraggablePuzzle puzzle={puzzle} onPuzzleClick={onPuzzleClick} />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
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