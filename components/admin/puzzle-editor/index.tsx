"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { DollarSign, Film, Users, Palette } from "lucide-react"
import { useArchivedGames } from "@/hooks/use-archived-games"
import RetitledEditor from "./retitled-editor"
import BudgetBracketEditor from "./budget-bracket-editor"
import CastClimbEditor from "./cast-climb-editor"
import PosterPixelsEditor from "./poster-pixels-editor"

type GameTabId = "retitled" | "budget-bracket" | "cast-climb" | "poster-pixels"

const ALL_TABS: Array<{
  id: GameTabId
  label: string
  icon: typeof Film
}> = [
  { id: "retitled", label: "Retitled", icon: Film },
  { id: "budget-bracket", label: "Budget Bracket", icon: DollarSign },
  { id: "cast-climb", label: "Cast Climb", icon: Users },
  { id: "poster-pixels", label: "Poster Pixels", icon: Palette },
]

export default function PuzzleEditor() {
  const searchParams = useSearchParams()
  const { archivedGameIds, loading: archivedGamesLoading } = useArchivedGames()

  const [activeTab, setActiveTab] = useState<GameTabId>("retitled")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)

  // Persistent state for each game (survives tab switches)
  const [gameStates, setGameStates] = useState({
    retitled: { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null },
    'budget-bracket': { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null },
    'cast-climb': { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null },
    'poster-pixels': { date: null as string | null, movieId: null as string | null, puzzleId: null as string | null }
  })
  
  const [hasInitialized, setHasInitialized] = useState(false)
  // Archived games the admin has intentionally opened in this session. Once a
  // user follows a link like ?gameType=budget-bracket we keep that tab visible
  // even after they navigate between tabs within the editor.
  const [sessionUnlockedGames, setSessionUnlockedGames] = useState<Set<GameTabId>>(new Set())

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
      const gameType = searchParams.get('gameType') as GameTabId | null
      const date = searchParams.get('date')
      const movieId = searchParams.get('movieId')
      const puzzleId = searchParams.get('puzzleId')
      
      if (gameType) {
        setActiveTab(gameType)
        // Unlock this tab for the session even if the game is archived.
        setSessionUnlockedGames((prev) => {
          const next = new Set(prev)
          next.add(gameType)
          return next
        })
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

  // Determine which game tabs should be rendered. Archived games are hidden by
  // default so the editor focuses on games currently accepting new puzzles; an
  // archived game is only revealed when the admin explicitly opened it in this
  // session (e.g. via a link from the schedule page to edit an old puzzle).
  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter((tab) => {
      if (!archivedGameIds.has(tab.id)) return true
      return sessionUnlockedGames.has(tab.id)
    })
  }, [archivedGameIds, sessionUnlockedGames])

  // If the active tab becomes hidden (archived + not unlocked), fall back to
  // the first visible tab. This matters when hook data resolves after first
  // render with the default `retitled` tab.
  useEffect(() => {
    if (archivedGamesLoading) return
    if (!hasInitialized) return
    const isActiveVisible = visibleTabs.some((tab) => tab.id === activeTab)
    if (!isActiveVisible && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [archivedGamesLoading, hasInitialized, visibleTabs, activeTab])

  const gridColsClass = useMemo(() => {
    switch (visibleTabs.length) {
      case 1:
        return "grid-cols-1"
      case 2:
        return "grid-cols-2"
      case 3:
        return "grid-cols-3"
      default:
        return "grid-cols-4"
    }
  }, [visibleTabs.length])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-funnel-display-bold text-neutral-900">Puzzle Editor</h1>
        <p className="text-neutral-600 mt-2 font-funnel">Create and manage puzzles for all cinamini games</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GameTabId)} className="w-full">
        <TabsList
          className={`grid w-full ${gridColsClass} h-auto p-0 bg-white border-2 border-neutral-200`}
          style={{
            boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.05)',
            borderRadius: 0
          }}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const isArchived = archivedGameIds.has(tab.id)
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="admin-tab flex items-center gap-2"
                title={isArchived ? `${tab.label} is archived — view and edit only` : undefined}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isArchived && (
                  <span className="ml-1 text-[10px] uppercase tracking-wide font-semibold text-amber-700">
                    Archived
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">
          {visibleTabs.some((tab) => tab.id === "retitled") && (
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
          )}

          {visibleTabs.some((tab) => tab.id === "budget-bracket") && (
            <TabsContent value="budget-bracket" className="space-y-6 mt-0">
              <Card className="admin-card-static p-6">
                <BudgetBracketEditor
                  prefilledDate={!hasInitialized ? selectedDate : gameStates['budget-bracket'].date}
                  puzzleId={gameStates['budget-bracket'].puzzleId}
                  onDateChange={(date) => updateGameDate('budget-bracket', date)}
                />
              </Card>
            </TabsContent>
          )}

          {visibleTabs.some((tab) => tab.id === "cast-climb") && (
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
          )}

          {visibleTabs.some((tab) => tab.id === "poster-pixels") && (
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
          )}
        </div>
      </Tabs>
    </div>
  )
}
