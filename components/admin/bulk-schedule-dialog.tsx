"use client"

import { useState } from "react"
import { format, addDays } from "date-fns"
import { CalendarIcon, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface BulkScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drafts: Array<{
    id: string
    film_title: string
    game_type: string
  }>
  onScheduled: () => void
}

export function BulkScheduleDialog({ 
  open, 
  onOpenChange, 
  drafts, 
  onScheduled 
}: BulkScheduleDialogProps) {
  const [startDate, setStartDate] = useState<Date>()
  const [selectedPuzzles, setSelectedPuzzles] = useState<Set<string>>(new Set())
  const [scheduleMode, setScheduleMode] = useState<"consecutive" | "weekdays">("consecutive")
  const [isScheduling, setIsScheduling] = useState(false)
  const { toast } = useToast()

  const handleSchedule = async () => {
    if (!startDate || selectedPuzzles.size === 0) {
      toast({
        title: "Missing information",
        description: "Please select puzzles and a start date",
        variant: "destructive"
      })
      return
    }

    setIsScheduling(true)

    try {
      const puzzlesToSchedule = Array.from(selectedPuzzles).map(id => 
        drafts.find(d => d.id === id)!
      )

      let currentDate = new Date(startDate)
      
      for (const puzzle of puzzlesToSchedule) {
        // Skip weekends if in weekdays mode
        if (scheduleMode === "weekdays") {
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate = addDays(currentDate, 1)
          }
        }

        const response = await fetch('/api/admin/puzzles/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            gameType: puzzle.game_type,
            newDate: format(currentDate, 'yyyy-MM-dd')
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to schedule puzzle')
        }

        currentDate = addDays(currentDate, 1)
      }

      toast({
        title: "Puzzles scheduled",
        description: `Successfully scheduled ${selectedPuzzles.size} puzzles`,
      })

      onScheduled()
      onOpenChange(false)
      setSelectedPuzzles(new Set())
    } catch (error) {
      console.error('Error scheduling puzzles:', error)
      toast({
        title: "Scheduling failed",
        description: error instanceof Error ? error.message : "Failed to schedule puzzles",
        variant: "destructive"
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const togglePuzzle = (puzzleId: string) => {
    const newSet = new Set(selectedPuzzles)
    if (newSet.has(puzzleId)) {
      newSet.delete(puzzleId)
    } else {
      newSet.add(puzzleId)
    }
    setSelectedPuzzles(newSet)
  }

  const selectAll = () => {
    setSelectedPuzzles(new Set(drafts.map(d => d.id)))
  }

  const selectNone = () => {
    setSelectedPuzzles(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Bulk Schedule Puzzles
          </DialogTitle>
          <DialogDescription>
            Schedule multiple draft puzzles at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Select Puzzles</Label>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectNone}
                >
                  Select None
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {drafts.map((puzzle) => (
                <div key={puzzle.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={puzzle.id}
                    checked={selectedPuzzles.has(puzzle.id)}
                    onCheckedChange={() => togglePuzzle(puzzle.id)}
                  />
                  <label
                    htmlFor={puzzle.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    <span className="text-muted-foreground">
                      [{puzzle.game_type.replace('_', ' ')}]
                    </span>{" "}
                    {puzzle.film_title}
                  </label>
                </div>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {selectedPuzzles.size} puzzle{selectedPuzzles.size !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="space-y-3">
            <Label>Schedule Mode</Label>
            <RadioGroup value={scheduleMode} onValueChange={(value) => setScheduleMode(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="consecutive" id="consecutive" />
                <label htmlFor="consecutive" className="text-sm cursor-pointer">
                  Consecutive days (including weekends)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekdays" id="weekdays" />
                <label htmlFor="weekdays" className="text-sm cursor-pointer">
                  Weekdays only (skip weekends)
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {startDate && selectedPuzzles.size > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Preview: {selectedPuzzles.size} puzzles will be scheduled starting from{" "}
                <span className="font-medium text-foreground">
                  {format(startDate, "MMMM d, yyyy")}
                </span>
                {scheduleMode === "weekdays" && " (skipping weekends)"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!startDate || selectedPuzzles.size === 0 || isScheduling}
          >
            {isScheduling ? "Scheduling..." : "Schedule Puzzles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}