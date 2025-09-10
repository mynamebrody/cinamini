"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Wand2, CalendarIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AIGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: () => void
}

export default function AIGenerateDialog({ open, onOpenChange, onGenerated }: AIGenerateDialogProps) {
  const [gameType, setGameType] = useState<'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels'>('retitled')
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined)
  const [obscurity, setObscurity] = useState(5)
  const [budgetClose, setBudgetClose] = useState(30)
  const [avoidRecentDays, setAvoidRecentDays] = useState(30)
  const [avoidSameGameDays, setAvoidSameGameDays] = useState(365)
  const [saving, setSaving] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGenerate = async () => {
    setSaving(true)
    setErrorMsg(null)
    try {
      const body = {
        gameType,
        targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        config: {
          obscurityThreshold: obscurity,
          budgetClosenessThreshold: budgetClose / 100,
          avoidRecentDays,
          avoidSameGameDays
        }
      }

      const genRes = await fetch('/api/admin/puzzles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const genData = await genRes.json()
      if (!genRes.ok) {
        throw new Error(genData?.error || 'Generation failed')
      }

      const puzzle = genData.puzzle

      // If no date selected, save as draft
      if (!targetDate) {
        puzzle.puzzle_date = null
        puzzle.is_published = false
      } else {
        puzzle.puzzle_date = format(targetDate, 'yyyy-MM-dd')
      }

      const saveGameType = gameType.replace('-', '_')
      const saveRes = await fetch('/api/admin/puzzles/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: saveGameType, puzzleData: puzzle })
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData?.error || 'Save failed')
      }

      toast({ title: 'Puzzle created', description: `A ${gameType} puzzle was created ${targetDate ? 'and scheduled' : 'as a draft'}.` })
      onGenerated()
      onOpenChange(false)
    } catch (e: any) {
      const msg = e?.message || 'AI generation failed. Please try again.'
      setErrorMsg(msg)
      toast({ title: 'AI generation failed', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Generate Puzzle with AI
          </DialogTitle>
          <DialogDescription>
            Creates a new puzzle that follows freshness and difficulty rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                <span className="text-sm">{errorMsg}</span>
                <Button size="sm" variant="outline" onClick={handleGenerate} disabled={saving}>
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Game</Label>
            <RadioGroup value={gameType} onValueChange={(v) => setGameType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="retitled" id="g-retitled" />
                <label htmlFor="g-retitled" className="text-sm cursor-pointer">Retitled</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="budget-bracket" id="g-budget" />
                <label htmlFor="g-budget" className="text-sm cursor-pointer">Budget Bracket</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cast-climb" id="g-cast" />
                <label htmlFor="g-cast" className="text-sm cursor-pointer">Cast Climb</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="poster-pixels" id="g-poster" />
                <label htmlFor="g-poster" className="text-sm cursor-pointer">Poster Pixels</label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Schedule (optional)</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !targetDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : "Pick a date or leave blank for draft"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={targetDate} 
                  onSelect={(d) => { setTargetDate(d); setDateOpen(false) }} 
                  initialFocus 
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <Label>Obscurity</Label>
                <span className="text-xs text-muted-foreground">{obscurity}/10</span>
              </div>
              <Slider min={1} max={10} step={1} value={[obscurity]} onValueChange={([v]) => setObscurity(v)} />
            </div>
            {gameType === 'budget-bracket' && (
              <div>
                <div className="flex items-center justify-between">
                  <Label>Budget Closeness</Label>
                  <span className="text-xs text-muted-foreground">{budgetClose}%</span>
                </div>
                <Slider min={10} max={50} step={5} value={[budgetClose]} onValueChange={([v]) => setBudgetClose(v)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Avoid any game (days)</Label>
                <Input type="number" value={avoidRecentDays} onChange={e => setAvoidRecentDays(parseInt(e.target.value) || 30)} />
              </div>
              <div>
                <Label className="text-xs">Avoid same game (days)</Label>
                <Input type="number" value={avoidSameGameDays} onChange={e => setAvoidSameGameDays(parseInt(e.target.value) || 365)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={saving}>
            {saving ? 'Generating...' : 'Generate & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
