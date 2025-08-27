"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { GameCalendar, type PuzzleDateInfo } from "@/components/game/game-calendar"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PosterPixelsArchiveProps {
  launchDate: Date
}

export default function PosterPixelsArchive({ launchDate }: PosterPixelsArchiveProps) {
  const router = useRouter()
  const [puzzleDates, setPuzzleDates] = useState<PuzzleDateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return format(today, 'yyyy-MM')
  })

  useEffect(() => {
    fetchPuzzleDates(currentMonth)
  }, [currentMonth])

  const fetchPuzzleDates = async (monthStr: string) => {
    try {
      setLoading(true)
      
      // Calculate start and end of month
      const [year, month] = monthStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0) // Last day of month
      
      const response = await fetch(
        `/api/games/poster-pixels/archive?` + 
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
      
      setPuzzleDates(dates)
    } catch (error) {
      console.error('Error fetching puzzle dates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: string) => {
    router.push(`/game/poster-pixels/${date}`)
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/game/poster-pixels')}
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
              gameSlug="poster-pixels"
              gameTitle="Poster Pixels"
              launchDate={launchDate}
              puzzleDates={puzzleDates}
              onDateSelect={handleDateSelect}
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