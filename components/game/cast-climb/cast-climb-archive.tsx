"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { GameCalendar, type PuzzleDateInfo } from "@/components/game/game-calendar"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CastClimbArchiveProps {
  launchDate: Date
}

export default function CastClimbArchive({ launchDate }: CastClimbArchiveProps) {
  const router = useRouter()
  const [puzzleDates, setPuzzleDates] = useState<PuzzleDateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dataCache, setDataCache] = useState<Map<string, PuzzleDateInfo[]>>(new Map())

  const fetchPuzzleDatesForMonth = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true)
      
      // Create cache key
      const cacheKey = `${year}-${month.toString().padStart(2, '0')}`
      
      // Check cache first
      if (dataCache.has(cacheKey)) {
        setPuzzleDates(dataCache.get(cacheKey)!)
        setLoading(false)
        return
      }
      
      // Calculate start and end of month (month is 0-indexed in JavaScript Date)
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0) // Last day of month
      
      const response = await fetch(
        `/api/games/cast-climb/archive?` + 
        `startDate=${format(startDate, 'yyyy-MM-dd')}&` +
        `endDate=${format(endDate, 'yyyy-MM-dd')}`
      )
      
      if (!response.ok) {
        console.error('Failed to fetch puzzle dates')
        return
      }
      
      const data = await response.json()
      
      // Transform the API response to match our component's expected format
      const dates: PuzzleDateInfo[] = data.dates.map((item: any) => ({
        date: item.date,
        hasPlayed: item.hasPlayed,
        hasPuzzle: item.hasPuzzle && item.isAvailable,
      }))
      
      // Cache the result
      setDataCache(prev => new Map(prev).set(cacheKey, dates))
      setPuzzleDates(dates)
    } catch (error) {
      console.error('Error fetching puzzle dates:', error)
    } finally {
      setLoading(false)
    }
  }, [dataCache])

  // Initialize with current month data
  useEffect(() => {
    const today = new Date()
    fetchPuzzleDatesForMonth(today.getFullYear(), today.getMonth())
  }, [fetchPuzzleDatesForMonth])

  const handleDateSelect = useCallback((date: string) => {
    router.push(`/game/cast-climb/${date}`)
  }, [router])

  const handleMonthChange = useCallback((year: number, month: number) => {
    fetchPuzzleDatesForMonth(year, month)
  }, [fetchPuzzleDatesForMonth])


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/game/cast-climb')}
            className="mb-4 hover:bg-cinema-red/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Today&apos;s Puzzle
          </Button>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-lg p-6">
          {loading && puzzleDates.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cinema-red mb-4"></div>
                <p className="text-muted-foreground">Loading archive...</p>
              </div>
            </div>
          ) : (
            <GameCalendar
              gameSlug="cast-climb"
              gameTitle="Cast Climb"
              launchDate={launchDate}
              puzzleDates={puzzleDates}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
            />
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Click on any available date to play that day&apos;s puzzle.</p>
          <p className="mt-2">Green dates indicate puzzles you&apos;ve already played.</p>
        </div>
      </div>
    </div>
  )
}