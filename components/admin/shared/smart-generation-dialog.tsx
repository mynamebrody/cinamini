"use client"

import { useState } from "react"
import { Wand2, Loader2, Settings, AlertCircle, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SmartGenerationDialogProps {
  gameType: 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels'
  targetDate: string
  onGenerate: (puzzleData: any) => void
  className?: string
}

export default function SmartGenerationDialog({
  gameType,
  targetDate,
  onGenerate,
  className
}: SmartGenerationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Generation configuration
  const [config, setConfig] = useState({
    obscurityThreshold: 5,
    budgetClosenessThreshold: 0.3,
    avoidRecentDays: 30,
    avoidSameGameDays: 365
  })
  
  // Suggestions if generation fails
  const [suggestions, setSuggestions] = useState<any[]>([])
  
  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setSuccess(false)
    setSuggestions([])
    
    try {
      const response = await fetch('/api/admin/puzzles/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameType,
          targetDate,
          config
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate puzzle')
      }
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setError('Could not generate puzzle automatically. Here are some suggestions:')
      } else if (data.puzzle) {
        // Successfully generated puzzle
        setSuccess(true)
        onGenerate(data.puzzle)
        
        // Close dialog after a short delay
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1500)
      }
      
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleSelectSuggestion = (movie: any) => {
    // Pass the movie as a starting point for manual puzzle creation
    onGenerate({ selectedMovie: movie })
    setOpen(false)
  }
  
  const getGameDescription = () => {
    switch (gameType) {
      case 'retitled':
        return 'Generate a puzzle with an interesting foreign title'
      case 'budget-bracket':
        return 'Generate movie pairs with comparable budgets'
      case 'cast-climb':
        return 'Generate a puzzle with a memorable ensemble cast'
      case 'poster-pixels':
        return 'Generate a puzzle with an iconic poster'
      default:
        return 'Generate a smart puzzle'
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-2 border-purple-500 text-purple-700 hover:bg-purple-50",
            className
          )}
        >
          <Wand2 className="w-4 h-4" />
          Smart Generate
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Smart Puzzle Generation
          </DialogTitle>
          <DialogDescription>
            {getGameDescription()} for {new Date(targetDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Configuration Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="obscurity">
                  Movie Obscurity Level
                </Label>
                <Badge variant="secondary">
                  {config.obscurityThreshold}/10
                </Badge>
              </div>
              <Slider
                id="obscurity"
                min={1}
                max={10}
                step={1}
                value={[config.obscurityThreshold]}
                onValueChange={([value]) => 
                  setConfig(prev => ({ ...prev, obscurityThreshold: value }))
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                1 = Popular blockbusters, 10 = Very obscure films
              </p>
            </div>
            
            {gameType === 'budget-bracket' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="budget">
                    Budget Closeness
                  </Label>
                  <Badge variant="secondary">
                    {Math.round(config.budgetClosenessThreshold * 100)}%
                  </Badge>
                </div>
                <Slider
                  id="budget"
                  min={10}
                  max={50}
                  step={5}
                  value={[config.budgetClosenessThreshold * 100]}
                  onValueChange={([value]) => 
                    setConfig(prev => ({ ...prev, budgetClosenessThreshold: value / 100 }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Maximum percentage difference between movie budgets
                </p>
              </div>
            )}
            
            {/* Advanced Settings */}
            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              </Button>
              
              {showAdvanced && (
                <div className="space-y-3 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="recent" className="text-xs">
                      Avoid movies used in any game (days)
                    </Label>
                    <Input
                      id="recent"
                      type="number"
                      min={7}
                      max={90}
                      value={config.avoidRecentDays}
                      onChange={(e) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          avoidRecentDays: parseInt(e.target.value) || 30 
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="samegame" className="text-xs">
                      Avoid movies used in {gameType} (days)
                    </Label>
                    <Input
                      id="samegame"
                      type="number"
                      min={30}
                      max={730}
                      value={config.avoidSameGameDays}
                      onChange={(e) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          avoidSameGameDays: parseInt(e.target.value) || 365 
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Success Message */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Puzzle generated successfully!
              </AlertDescription>
            </Alert>
          )}
          
          {/* Movie Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Select a movie to use as a starting point:</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suggestions.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => handleSelectSuggestion(movie)}
                    className="w-full text-left p-2 rounded border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {movie.poster_path && (
                        <picture>
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            width={32}
                            height={48}
                            className="w-8 h-12 object-cover rounded"
                          />
                        </picture>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{movie.title}</div>
                        <div className="text-xs text-gray-500">
                          {movie.release_date?.substring(0, 4)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Generate Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Puzzle
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}