"use client"

import { AlertTriangle, Calendar, Users, Film, Clock } from "lucide-react"
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
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  puzzle?: {
    id: string
    film_title: string
    puzzle_date: string | null
    game_type: string
    is_published: boolean
    [key: string]: any
  }
  warnings?: {
    isLivePuzzle: boolean
    hasBeenPlayed: boolean
    puzzleDate: string | null
    isPublished: boolean
  }
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive" | "warning"
}

const gameConfig = {
  retitled: {
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: Film,
    label: "Retitled"
  },
  budget_bracket: {
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Users,
    label: "Budget Bracket"
  },
  cast_climb: {
    color: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    icon: Users,
    label: "Cast Climb"
  },
  poster_pixels: {
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: Film,
    label: "Poster Pixels"  
  }
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  puzzle,
  warnings,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default"
}: ConfirmationDialogProps) {
  const hasWarnings = warnings && (warnings.isLivePuzzle || warnings.hasBeenPlayed)

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-amber-200 bg-amber-50"
      default:
        return "border-gray-200 bg-white"
    }
  }

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case "destructive":
        return "destructive"
      case "warning":
        return "default"
      default:
        return "default"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", getVariantStyles())}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasWarnings && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>

        {puzzle && (
          <div className="space-y-4">
            {/* Puzzle Info */}
            <div className="p-3 rounded-lg border bg-white/50">
              <div className="flex items-center gap-2 mb-2">
                {puzzle.game_type && gameConfig[puzzle.game_type as keyof typeof gameConfig] && (
                  <>
                    <Badge className={cn("gap-1", gameConfig[puzzle.game_type as keyof typeof gameConfig].color)}>
                      {gameConfig[puzzle.game_type as keyof typeof gameConfig].label}
                    </Badge>
                    <span className="font-medium text-sm">{puzzle.film_title}</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-600">
                {puzzle.puzzle_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(puzzle.puzzle_date), "MMM d, yyyy")}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Badge 
                    variant={puzzle.is_published ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {puzzle.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Warning Information */}
            {hasWarnings && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-amber-800">
                      Warning: This puzzle may affect live gameplay
                    </p>
                    <ul className="text-amber-700 space-y-1 text-xs">
                      {warnings.isLivePuzzle && (
                        <li className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Puzzle is currently live (today or earlier)
                        </li>
                      )}
                      {warnings.hasBeenPlayed && (
                        <li className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Players have already submitted guesses
                        </li>
                      )}
                    </ul>
                    <p className="text-xs text-amber-600 mt-2">
                      Changes to this puzzle may affect user scores and game integrity.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={getConfirmButtonVariant()} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}