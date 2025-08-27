"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

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
}

export function GameCalendar({
  gameSlug,
  gameTitle,
  launchDate,
  puzzleDates = [],
  currentDate,
  onDateSelect,
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
  
  // Create a map for quick lookup of puzzle dates
  const puzzleDateMap = React.useMemo(() => {
    const map = new Map<string, PuzzleDateInfo>()
    puzzleDates.forEach(info => {
      map.set(info.date, info)
    })
    return map
  }, [puzzleDates])
  
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()
  
  // Get available months (from launch to current month)
  const availableMonths = React.useMemo(() => {
    const months = []
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const startDate = new Date(launchDate)
    
    const date = new Date(startDate)
    while (date <= endDate) {
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: format(date, "MMMM"),
      })
      date.setMonth(date.getMonth() + 1)
    }
    
    return months
  }, [launchDate, today])
  
  // Get available years
  const availableYears = React.useMemo(() => {
    const years = []
    const startYear = launchDate.getFullYear()
    const endYear = today.getFullYear()
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(year)
    }
    
    return years
  }, [launchDate, today])
  
  const handleDateClick = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    
    if (onDateSelect) {
      onDateSelect(dateString)
    } else {
      // Default behavior: navigate to the game page for that date
      router.push(`/game/${gameSlug}/${dateString}`)
    }
  }
  
  const handleMonthChange = (month: string) => {
    const newDate = new Date(viewDate)
    newDate.setMonth(parseInt(month))
    setViewDate(newDate)
  }
  
  const handleYearChange = (year: string) => {
    const newDate = new Date(viewDate)
    newDate.setFullYear(parseInt(year))
    setViewDate(newDate)
  }
  
  const navigateToPreviousMonth = () => {
    const newDate = new Date(viewDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setViewDate(newDate)
  }
  
  const navigateToNextMonth = () => {
    const newDate = new Date(viewDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setViewDate(newDate)
  }
  
  const getDayStyles = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const puzzleInfo = puzzleDateMap.get(dateString)
    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    const isLaunchDate = format(date, 'yyyy-MM-dd') === format(launchDate, 'yyyy-MM-dd')
    const isFuture = date > today
    const isBeforeLaunch = date < launchDate
    const isSelected = currentDate === dateString
    
    // Determine if date should be disabled
    const isDisabled = isFuture || isBeforeLaunch || (puzzleInfo && !puzzleInfo.hasPuzzle)
    
    return cn(
      "h-10 w-10 p-0 font-normal hover:bg-accent hover:text-accent-foreground transition-colors rounded-md",
      "flex items-center justify-center cursor-pointer relative",
      {
        // Disabled states (future dates or before launch)
        "text-muted-foreground/50 cursor-not-allowed hover:bg-transparent": isDisabled,
        
        // Today's date - special gold highlight
        "bg-cinema-gold text-white hover:bg-cinema-gold/90": isToday && !isDisabled,
        "ring-2 ring-cinema-gold ring-offset-2": isToday && !isDisabled,
        
        // Launch date - special marker
        "bg-cinema-red/10 text-cinema-red font-semibold": isLaunchDate && !isToday,
        "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2": isLaunchDate,
        "after:w-1 after:h-1 after:bg-cinema-red after:rounded-full": isLaunchDate,
        
        // Previously played dates
        "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20": 
          puzzleInfo?.hasPlayed && !isToday && !isSelected,
        
        // Selected date
        "bg-cinema-red text-white hover:bg-cinema-red/90": isSelected && !isToday,
        
        // Available but unplayed dates
        "hover:bg-gray-100 dark:hover:bg-gray-800": 
          !isDisabled && !puzzleInfo?.hasPlayed && !isToday && !isSelected && !isLaunchDate,
      }
    )
  }
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentMonthStart = firstDay.getTime()
    const currentMonthEnd = lastDay.getTime()
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const isOutsideMonth = date.getTime() < currentMonthStart || date.getTime() > currentMonthEnd
      
      if (isOutsideMonth && date.getDate() > 7) {
        // Skip rendering days from next month after we've filled the grid
        break
      }
      
      days.push(date)
    }
    
    return days
  }
  
  const calendarDays = generateCalendarDays()
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-cinema-red mb-2">{gameTitle} archive</h2>
        <p className="text-muted-foreground">
          Play puzzles since {format(launchDate, 'MMMM d, yyyy')}
        </p>
      </div>
      
      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={navigateToPreviousMonth}
          disabled={viewDate <= launchDate}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex gap-2">
          <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths
                .filter(m => m.year === currentYear)
                .map(({ month, label }) => (
                  <SelectItem key={month} value={month.toString()}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={navigateToNextMonth}
          disabled={
            viewDate.getMonth() === today.getMonth() && 
            viewDate.getFullYear() === today.getFullYear()
          }
          className="h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border p-4 shadow-[2px_2px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-medium text-muted-foreground p-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dateString = format(date, 'yyyy-MM-dd')
            const puzzleInfo = puzzleDateMap.get(dateString)
            const isOutsideMonth = date.getMonth() !== currentMonth
            const isFuture = date > today
            const isBeforeLaunch = date < launchDate
            const isDisabled = isFuture || isBeforeLaunch || (puzzleInfo && !puzzleInfo.hasPuzzle)
            
            if (isOutsideMonth) {
              return <div key={index} className="h-10 w-10" />
            }
            
            return (
              <button
                key={index}
                onClick={() => !isDisabled && handleDateClick(date)}
                disabled={isDisabled}
                className={getDayStyles(date)}
                aria-label={`Select ${format(date, 'MMMM d, yyyy')}`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
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
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
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