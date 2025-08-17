"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { DollarSign, Film, Users, Palette } from "lucide-react"
import RetitledEditor from "./retitled-editor"
import BudgetBracketEditor from "./budget-bracket-editor"
import CastClimbEditor from "./cast-climb-editor"
import PosterPixelsEditor from "./poster-pixels-editor"

export default function PuzzleEditor() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("retitled")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null)
  
  // Persistent state for each game (survives tab switches)
  const [gameStates, setGameStates] = useState({
    retitled: { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null },
    'budget-bracket': { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null },
    'cast-climb': { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null },
    'poster-pixels': { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null }
  })
  
  const [hasInitialized, setHasInitialized] = useState(false)

  // Suppress browser extension errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress Chrome extension errors
      if (
        event.message.includes('Extension context invalidated') ||
        event.message.includes('message port closed') ||
        event.message.includes('runtime.lastError') ||
        event.filename?.includes('extension')
      ) {
        event.preventDefault()
        return true
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || ''
      if (
        reason.includes('message port closed') ||
        reason.includes('Extension context invalidated') ||
        reason.includes('runtime.lastError')
      ) {
        event.preventDefault()
        return true
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    // Handle URL parameters ONLY on initial load
    if (!hasInitialized) {
      const gameType = searchParams.get('gameType')
      const date = searchParams.get('date')
      const movieId = searchParams.get('movieId')
      const puzzleId = searchParams.get('puzzleId')
      
      if (gameType) {
        setActiveTab(gameType)
      }
      if (date) {
        setSelectedDate(date)
        // Set the date for all games initially
        setGameStates(prev => ({
          retitled: { ...prev.retitled, date },
          'budget-bracket': { ...prev['budget-bracket'], date },
          'cast-climb': { ...prev['cast-climb'], date },
          'poster-pixels': { ...prev['poster-pixels'], date }
        }))
      }
      if (movieId) {
        setSelectedMovieId(movieId)
        // Set the movieId for applicable games initially
        setGameStates(prev => ({
          retitled: { ...prev.retitled, movieId },
          'budget-bracket': { ...prev['budget-bracket'] }, // Budget bracket doesn't use movieId
          'cast-climb': { ...prev['cast-climb'], movieId },
          'poster-pixels': { ...prev['poster-pixels'], movieId }
        }))
      }
      
      if (puzzleId && gameType) {
        setSelectedPuzzleId(puzzleId)
        // Set the puzzleId for the specific game type
        setGameStates(prev => {
          const newStates = {
            ...prev,
            [gameType]: { ...prev[gameType as keyof typeof prev], puzzleId }
          }
          return newStates
        })
      }
      
      setHasInitialized(true)
    }
  }, [searchParams, hasInitialized])


  // Callbacks to update game-specific state
  const updateGameDate = (gameType: string, date: string | null) => {
    setGameStates(prev => ({
      ...prev,
      [gameType]: { ...prev[gameType as keyof typeof prev], date }
    }))
  }

  const updateGameMovieId = (gameType: string, movieId: string | null) => {
    setGameStates(prev => ({
      ...prev,
      [gameType]: { ...prev[gameType as keyof typeof prev], movieId }
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-funnel-display-bold text-neutral-900">Puzzle Editor</h1>
        <p className="text-neutral-600 mt-2 font-funnel">Create and manage puzzles for all cinamini games</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-white border-2 border-neutral-200" style={{
          boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.05)',
          borderRadius: 0
        }}>
          <TabsTrigger value="retitled" className="admin-tab flex items-center gap-2">
            <Film className="w-4 h-4" />
            <span>Retitled</span>
          </TabsTrigger>
          <TabsTrigger value="budget-bracket" className="admin-tab flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Budget Bracket</span>
          </TabsTrigger>
          <TabsTrigger value="cast-climb" className="admin-tab flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Cast Climb</span>
          </TabsTrigger>
          <TabsTrigger value="poster-pixels" className="admin-tab flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span>Poster Pixels</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="retitled" className="space-y-6 mt-0">
            <Card className="admin-card-static p-6">
              <RetitledEditor 
                prefilledDate={!hasInitialized ? selectedDate : gameStates.retitled.date} 
                prefilledMovieId={!hasInitialized ? selectedMovieId : gameStates.retitled.movieId}
                puzzleId={gameStates.retitled.puzzleId}
                onDateChange={(date) => updateGameDate('retitled', date)}
                onMovieChange={(movieId) => updateGameMovieId('retitled', movieId)}
              />
            </Card>
          </TabsContent>

          <TabsContent value="budget-bracket" className="space-y-6 mt-0">
            <Card className="admin-card-static p-6">
              <BudgetBracketEditor 
                prefilledDate={!hasInitialized ? selectedDate : gameStates['budget-bracket'].date}
                puzzleId={gameStates['budget-bracket'].puzzleId}
                onDateChange={(date) => updateGameDate('budget-bracket', date)}
                // Note: Budget Bracket ignores movieId parameter per requirements
              />
            </Card>
          </TabsContent>

          <TabsContent value="cast-climb" className="space-y-6 mt-0">
            <Card className="admin-card-static p-6">
              <CastClimbEditor 
                prefilledDate={!hasInitialized ? selectedDate : gameStates['cast-climb'].date} 
                prefilledMovieId={!hasInitialized ? selectedMovieId : gameStates['cast-climb'].movieId}
                puzzleId={gameStates['cast-climb'].puzzleId}
                onDateChange={(date) => updateGameDate('cast-climb', date)}
                onMovieChange={(movieId) => updateGameMovieId('cast-climb', movieId)}
              />
            </Card>
          </TabsContent>

          <TabsContent value="poster-pixels" className="space-y-6 mt-0">
            <Card className="admin-card-static p-6">
              <PosterPixelsEditor 
                prefilledDate={!hasInitialized ? selectedDate : gameStates['poster-pixels'].date} 
                prefilledMovieId={!hasInitialized ? selectedMovieId : gameStates['poster-pixels'].movieId}
                puzzleId={gameStates['poster-pixels'].puzzleId}
                onDateChange={(date) => updateGameDate('poster-pixels', date)}
                onMovieChange={(movieId) => updateGameMovieId('poster-pixels', movieId)}
              />
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}