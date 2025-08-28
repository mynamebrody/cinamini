"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
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
}

interface GameCalendarProps {
  gameSlug: string // e.g., 'retitled', 'budget-bracket', etc.
  gameTitle: string // e.g., 'Retitled', 'Budget Bracket', etc.
  launchDate: Date
  puzzleDates?: PuzzleDateInfo[]
  currentDate?: string // Currently selected date
  onDateSelect?: (date: string) => void
  onMonthChange?: (year: number, month: number) => void // Callback when user navigates months
}

export function GameCalendar({
  gameSlug,
  gameTitle,
  launchDate,
  puzzleDates = [],
  currentDate,
  onDateSelect,
  onMonthChange,
}: GameCalendarProps) {
  const router = useRouter()
  const today = React.useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  
  const [viewDate, setViewDate] = React.useState(() => {
    if (currentDate) {
      return new Date(currentDate + 'T00:00:00Z')
    }
    return today
  })
  
  // Process puzzle dates for react-day-picker modifiers
  const { playedDates, availableDates, disabledDates } = React.useMemo(() => {
    const played: Date[] = []
    const available: Date[] = []
    const disabled: Date[] = []
    
    puzzleDates.forEach(info => {
      const date = new Date(info.date + 'T00:00:00Z')
      const isFuture = date > today
      const isBeforeLaunch = date < launchDate
      
      if (isFuture || isBeforeLaunch || !info.hasPuzzle) {
        disabled.push(date)
      } else if (info.hasPlayed) {
        played.push(date)
      } else if (info.hasPuzzle) {
        available.push(date)
      }
    })
    
    return { playedDates: played, availableDates: available, disabledDates: disabled }
  }, [puzzleDates, today, launchDate])
  
  // Get available months for navigation
  const availableMonths = React.useMemo(() => {
    const months = []
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const startDate = new Date(launchDate)
    
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
  }, [launchDate, today])
  
  const handleDateClick = (date: Date | undefined) => {
    if (!date) return
    
    const dateString = format(date, 'yyyy-MM-dd')
    
    if (onDateSelect) {
      onDateSelect(dateString)
    } else {
      router.push(`/game/${gameSlug}/${dateString}`)
    }
  }
  
  const handleMonthChange = (monthYear: string) => {
    const [monthName, year] = monthYear.split(' ')
    const monthNum = new Date(`${monthName} 1, ${year}`).getMonth()
    const newDate = new Date(parseInt(year), monthNum, 1)
    setViewDate(newDate)
    
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth())
    }
  }
  
  // Setup react-day-picker modifiers for visual styling
  const modifiers = React.useMemo(() => ({
    today: [today],
    launchDate: [launchDate], 
    played: playedDates,
    available: availableDates,
    disabled: disabledDates,
  }), [today, launchDate, playedDates, availableDates, disabledDates])
  
  const modifiersClassNames = React.useMemo(() => ({
    today: "bg-cinema-gold text-white hover:bg-cinema-gold/90 ring-2 ring-cinema-gold ring-offset-2",
    launchDate: "bg-cinema-red/10 text-cinema-red font-semibold relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-cinema-red after:rounded-full",
    played: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
    available: "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100",
    disabled: "text-muted-foreground/50 cursor-not-allowed opacity-50",
  }), [])
  
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-cinema-red mb-2">{gameTitle} archive</h2>
        <p className="text-muted-foreground">
          Play puzzles since {format(launchDate, 'MMMM d, yyyy')}
        </p>
      </div>
      
      {/* Month Navigation */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex gap-2">
          <Select value={format(viewDate, "MMMM yyyy")} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[200px] rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700">
              {availableMonths.map(({ label }) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Calendar using UI Calendar component */}
      <div className="bg-white dark:bg-gray-950 rounded-none border p-4 shadow-[2px_2px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]">
        <Calendar
          mode="single"
          month={viewDate}
          onMonthChange={(newMonth) => {
            if (newMonth) {
              setViewDate(newMonth)
              if (onMonthChange) {
                onMonthChange(newMonth.getFullYear(), newMonth.getMonth())
              }
            }
          }}
          onDayClick={handleDateClick}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          disabled={[
            { before: launchDate },
            { after: today },
            ...disabledDates
          ]}
          className="w-full"
          classNames={{
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md w-full font-normal text-sm flex-1 text-center p-2",
            row: "flex w-full mt-1",
            cell: "flex-1 text-center p-1",
            day: "h-10 w-10 mx-auto font-normal rounded-md transition-colors",
            day_outside: "text-muted-foreground/50",
          }}
        />
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-cinema-gold rounded" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-cinema-red/10 rounded relative">
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-cinema-red rounded-full" />
          </div>
          <span>Launch Date</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/10 rounded" />
          <span>Played</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-900 rounded opacity-50" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  )
}