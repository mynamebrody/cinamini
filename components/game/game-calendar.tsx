"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface PuzzleDateInfo {
  date: string // YYYY-MM-DD format
  hasPlayed: boolean
  hasPuzzle: boolean
  isAvailable: boolean
}

interface GameCalendarProps {
  gameSlug: string
  gameTitle: string
  launchDate: Date
  puzzleDates?: PuzzleDateInfo[]
  onDateSelect?: (date: string) => void
  onMonthChange?: (monthYear: string) => void
}

export function GameCalendar({
  gameSlug,
  gameTitle,
  launchDate,
  puzzleDates = [],
  onDateSelect,
  onMonthChange,
}: GameCalendarProps) {
  const router = useRouter()
  const today = React.useMemo(() => new Date(), [])

  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Get all days in the current month
  const monthDays = React.useMemo(() => {
    const start = startOfMonth(new Date(currentMonth.year, currentMonth.month))
    const end = endOfMonth(new Date(currentMonth.year, currentMonth.month))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Create a map of puzzle data for quick lookup
  const puzzleMap = React.useMemo(() => {
    const map = new Map<string, PuzzleDateInfo>()
    puzzleDates.forEach(puzzle => {
      map.set(puzzle.date, puzzle)
    })
    return map
  }, [puzzleDates])

  const handleDateClick = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const puzzleInfo = puzzleMap.get(dateString)

    // Only allow clicking if there's an available puzzle
    if (puzzleInfo?.isAvailable && puzzleInfo?.hasPuzzle) {
      if (onDateSelect) {
        onDateSelect(dateString)
      } else {
        router.push(`/game/${gameSlug}/${dateString}`)
      }
    }
  }

  const handleMonthChange = (monthYear: string) => {
    const [monthName, year] = monthYear.split(' ')
    const monthNum = new Date(`${monthName} 1, ${year}`).getMonth()
    const newMonth = { year: parseInt(year), month: monthNum }
    setCurrentMonth(newMonth)

    if (onMonthChange) {
      onMonthChange(monthYear)
    }
  }

  // Generate months from August 2025 to December 2025
  const availableMonths = React.useMemo(() => {
    const months = []
    const startDate = new Date(2025, 7, 1) // August 2025 (month 7)
    const endDate = new Date(2025, 11, 31) // December 2025 (month 11)

    const date = new Date(startDate)
    while (date <= endDate) {
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: format(date, "MMMM yyyy"),
      })
      date.setMonth(date.getMonth() + 1)
    }

    return months
  }, [])

  const getDayStyle = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const puzzleInfo = puzzleMap.get(dateString)
    const isToday = isSameDay(date, today)
    const isBeforeLaunch = date < launchDate
    const isFuture = date > today
    const isAugust2nd = date.getMonth() === 7 && date.getDate() === 2 // Month 7 = August

    // Determine if the date is disabled
    const isDisabled = isBeforeLaunch || (isFuture && !puzzleInfo?.hasPuzzle)

    if (isDisabled) {
      // Disabled dates - no hover, no pointer cursor
      if (isBeforeLaunch) {
        // Before launch - light gray background
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-gray-200 text-gray-500 border border-gray-200 cursor-not-allowed`
      } else {
        // Future or no puzzle - disabled gray
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed`
      }
    } else {
      // Enabled dates - add hover effects

      if (isAugust2nd) {
        // Anniversary day - gold background
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-cinema-gold text-cinema-red font-semibold border border-cinema-gold transition-all duration-150 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]`
      } else if (isToday) {
        // Today - red background
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-cinema-red text-white border border-cinema-red transition-all duration-150 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]`
      } else if (puzzleInfo?.hasPlayed) {
        // Played - green background and border
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-cinema-green text-white border border-cinema-green transition-all duration-150 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]`
      } else if (puzzleInfo?.isAvailable) {
        // Available but not played - white with gray border
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-white text-gray-900 border border-gray-300 transition-all duration-150 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]`
      } else {
        // Unavailable but not disabled - gray
        return `w-14 h-14 flex items-center justify-center text-lg font-medium bg-gray-100 text-gray-400 border border-gray-100 transition-all duration-150 hover:border-cinema-red hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]`
      }
    }
  }

  const getWeekdays = () => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  }

  const getDaysInMonth = () => {
    const firstDay = monthDays[0]
    const lastDay = monthDays[monthDays.length - 1]
    const firstDayOfWeek = firstDay.getDay()

    // Add empty cells for days before the first day of the month
    const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => null)

    return [...emptyDays, ...monthDays]
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Calendar Grid */}
      <div className="bg-white border border-[rgb(209,210,212)] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)] p-6">
        {/* Month and Year Header */}
        <div className="flex items-center justify-between mb-6">
          <Select
            value={format(new Date(currentMonth.year, currentMonth.month), "MMMM yyyy")}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[200px] bg-white border border-[rgb(209,210,212)] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212)] rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-[rgb(209,210,212)] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212)] rounded-none">
              {availableMonths.map(({ label }) => (
                <SelectItem key={label} value={label} className="rounded-none">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4 ml-2">
          {getWeekdays().map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2 ml-2">
          {getDaysInMonth().map((date, index) => (
            <div key={index} className="aspect-square">
              {date ? (
                <button
                  onClick={() => handleDateClick(date)}
                  className={getDayStyle(date)}
                  disabled={
                    date < launchDate ||
                    (date > today && !puzzleMap.get(format(date, 'yyyy-MM-dd'))?.hasPuzzle)
                  }
                >
                  {date.getDate()}
                </button>
              ) : (
                <div className="w-14 h-14" /> // Empty cell
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Shared Archive Component
interface GameArchiveProps {
  gameSlug: string
  gameTitle: string
  launchDate: Date
}

export function GameArchive({
  gameSlug,
  gameTitle,
  launchDate
}: GameArchiveProps) {
  const router = useRouter()
  const [puzzleDates, setPuzzleDates] = React.useState<PuzzleDateInfo[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dataCache, setDataCache] = React.useState<Map<string, PuzzleDateInfo[]>>(new Map())
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  })

  const fetchPuzzleDatesForMonth = React.useCallback(async (year: number, month: number) => {
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

      // Calculate start and end of month
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)

      const apiUrl = `/api/games/${gameSlug}/archive?` +
        `startDate=${format(startDate, 'yyyy-MM-dd')}&` +
        `endDate=${format(endDate, 'yyyy-MM-dd')}`

      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`🐛 [${gameTitle} Archive] Failed to fetch puzzle dates:`, response.status, errorText)
        return
      }

      const data = await response.json()

      // Transform the API response to match our component's expected format
      const dates: PuzzleDateInfo[] = data.dates.map((item: any) => ({
        date: item.date,
        hasPlayed: item.hasPlayed,
        hasPuzzle: item.hasPuzzle,
        isAvailable: item.isAvailable,
      }))

      // Cache the result
      setDataCache(prev => new Map(prev).set(cacheKey, dates))
      setPuzzleDates(dates)
    } catch (error) {
      console.error(`🐛 [${gameTitle} Archive] Error fetching puzzle dates:`, error)
    } finally {
      setLoading(false)
    }
  }, [dataCache, gameSlug, gameTitle])

  // Initialize with current month data
  React.useEffect(() => {
    fetchPuzzleDatesForMonth(selectedMonth.year, selectedMonth.month)
  }, [fetchPuzzleDatesForMonth, selectedMonth])

  const handleDateSelect = React.useCallback((date: string) => {
    router.push(`/game/${gameSlug}/${date}`)
  }, [router, gameSlug])

  const handleMonthChange = React.useCallback((monthYear: string) => {
    const [monthName, year] = monthYear.split(' ')
    const monthNum = new Date(`${monthName} 1, ${year}`).getMonth()
    const newMonth = { year: parseInt(year), month: monthNum }
    setSelectedMonth(newMonth)
    fetchPuzzleDatesForMonth(parseInt(year), monthNum)
  }, [fetchPuzzleDatesForMonth])

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Archive Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cinema-red">{gameTitle} Archive</h1>
        </div>

        {/* Calendar */}
        {loading && puzzleDates.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-cinema-red border-t-transparent"></div>
              <div>
                <p className="text-lg font-medium text-cinema-red">Loading Archive</p>
                <p className="text-sm text-muted-foreground mt-2">Fetching puzzle data...</p>
              </div>
            </div>
          </div>
        ) : (
          <GameCalendar
            gameSlug={gameSlug}
            gameTitle={gameTitle}
            launchDate={launchDate}
            puzzleDates={puzzleDates}
            onDateSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
          />
        )}

        {/* Instructions */}
        <div className="mt-8 text-center space-y-2 max-w-2xl mx-auto">
          <p className="text-muted-foreground">
            Click on any available date to play that day's puzzle
          </p>
          <p className="text-sm text-muted-foreground">
            Dates with a green tint indicate puzzles you've already played
          </p>
        </div>
      </div>
    </div>
  )
}