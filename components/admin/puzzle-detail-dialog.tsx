"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar, Film, DollarSign, Users, Trash2, Save, X, Image, Edit } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PuzzleDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  puzzles: Array<{
    id: string
    puzzle_date: string | null
    film_title: string
    game_type: 'retitled' | 'budget_bracket' | 'cast_climb' | 'poster_pixels'
    difficulty_level?: number
    created_at: string
    [key: string]: any
  }>
  date: Date | null
  onUpdate: () => void
}

const gameConfig = {
  retitled: {
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    bgColor: "bg-blue-50",
    icon: Film,
    label: "Retitled"
  },
  budget_bracket: {
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    bgColor: "bg-emerald-50",
    icon: DollarSign,
    label: "Budget Bracket"
  },
  cast_climb: {
    color: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    bgColor: "bg-violet-50",
    icon: Users,
    label: "Cast Climb"
  },
  poster_pixels: {
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    bgColor: "bg-purple-50",
    icon: Image,
    label: "Poster Pixels"  
  }
}

export function PuzzleDetailDialog({ 
  open, 
  onOpenChange, 
  puzzles, 
  date,
  onUpdate 
}: PuzzleDetailDialogProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleRemoveFromSchedule = async (puzzle: any) => {
    setIsDeleting(puzzle.id)

    try {
      const response = await fetch(
        `/api/admin/puzzles/reschedule?puzzleId=${puzzle.id}&gameType=${puzzle.game_type}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast({
          title: "Puzzle unscheduled",
          description: "The puzzle has been moved back to drafts",
        })
        onUpdate()
      } else {
        throw new Error('Failed to unschedule puzzle')
      }
    } catch (error) {
      console.error('Error unscheduling puzzle:', error)
      toast({
        title: "Error",
        description: "Failed to unschedule puzzle",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleEditPuzzle = (puzzle: any, event?: React.MouseEvent) => {
    event?.preventDefault() // Prevent default link behavior
    event?.stopPropagation() // Prevent parent click handlers
    // Navigate to puzzle editor with puzzle ID
    const gameType = puzzle.game_type.replace(/_/g, '-') // Replace all underscores with hyphens
    const url = `/admin/puzzle-editor?puzzleId=${puzzle.id}&gameType=${gameType}`
    console.log('Navigating to:', url) // Debug log
    
    // Force navigation with window.location instead of router.push
    window.location.href = url
  }

  const renderPuzzleDetails = (puzzle: any) => {
    const config = gameConfig[puzzle.game_type]
    const Icon = config.icon

    switch (puzzle.game_type) {
      case 'retitled':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Country:</span>
              <span className="text-sm font-medium">{puzzle.country_code}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Localized Title:</span>
              <span className="text-sm font-medium">{puzzle.localized_title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Difficulty:</span>
              <Badge variant="outline">{puzzle.difficulty_level || 1}/5</Badge>
            </div>
          </div>
        )
      
      case 'budget_bracket':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Seed:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{puzzle.seed_value}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Movie Pairs:</span>
              <span className="text-sm font-medium">
                {puzzle.pairs ? (typeof puzzle.pairs === 'string' ? JSON.parse(puzzle.pairs).length : puzzle.pairs.length) : 0} pairs
              </span>
            </div>
          </div>
        )
      
      case 'cast_climb':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Release Year:</span>
              <span className="text-sm font-medium">{puzzle.film_release_year}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Actors:</span>
              <span className="text-sm font-medium">{puzzle.total_actors || 4}</span>
            </div>
            {puzzle.fun_fact && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-muted-foreground">Fun Fact:</span>
                <span className="text-sm">{puzzle.fun_fact}</span>
              </div>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {date && format(date, "MMMM d, yyyy")}
          </DialogTitle>
          <DialogDescription>
            {puzzles.length} puzzle{puzzles.length !== 1 ? 's' : ''} scheduled for this date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {puzzles.map((puzzle, index) => {
            const config = gameConfig[puzzle.game_type]
            const Icon = config.icon

            return (
              <div key={`${puzzle.game_type}-${puzzle.id}`} className={cn("rounded-lg p-4 -mx-2", index > 0 && "mt-4", config.bgColor)}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("gap-1", config.color)}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <h3 className="font-semibold">{puzzle.film_title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(puzzle.created_at), "PPp")}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-blue-50"
                        onClick={(e) => handleEditPuzzle(puzzle, e)}
                        title="Edit puzzle"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10"
                        onClick={() => handleRemoveFromSchedule(puzzle)}
                        disabled={isDeleting === puzzle.id}
                        title="Remove from schedule"
                      >
                        {isDeleting === puzzle.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {renderPuzzleDetails(puzzle)}
                </div>
              </div>
            )
          })}

          {puzzles.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No puzzles scheduled for this date</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}