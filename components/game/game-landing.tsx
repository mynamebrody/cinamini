"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Play, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface GameLandingProps {
  gameId: string
  gameName: string
  puzzleNumber?: number
  puzzleDate?: string
  backgroundColor: string
  emoji: string
  children: React.ReactNode
  onStart: () => void
  showBackButton?: boolean
}

export function GameLanding({
  gameId,
  gameName,
  puzzleNumber,
  puzzleDate,
  backgroundColor,
  emoji,
  children,
  onStart,
  showBackButton = true
}: GameLandingProps) {
  const router = useRouter()
  
  // Determine if we need dark text for light backgrounds
  const useDarkText = backgroundColor === "#f7ee8b" // Light golden backgrounds need dark text
  const textColor = useDarkText ? "text-gray-900" : "text-white"
  const textColorMuted = useDarkText ? "text-gray-700" : "text-white/70"
  const textColorSecondary = useDarkText ? "text-gray-800" : "text-white/90"

  const handleBack = () => {
    router.push("/")
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
    
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor }}
    >
      {/* Header with back button */}
      {showBackButton && (
        <div className="p-4 md:p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={`${useDarkText ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-900/10' : 'text-white/80 hover:text-white hover:bg-white/20'} transition-colors backdrop-blur-sm`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-8">
        <div className={`w-full max-w-2xl text-center ${textColor}`}>
          {/* Date */}
          <p className={`${textColorMuted} text-sm md:text-base font-funnel mb-4 md:mb-6 uppercase tracking-wider font-medium`}>
            {formatDate(puzzleDate)}
          </p>

          {/* Game emoji */}
          <div className="text-6xl md:text-8xl mb-6 md:mb-8 drop-shadow-lg">
            {emoji}
          </div>

          {/* Game title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-funnel-display-bold mb-3 md:mb-4 tracking-tight drop-shadow-sm">
            {gameName}
          </h1>

          {/* Puzzle number */}
          {puzzleNumber && (
            <p className={`${textColorSecondary} text-lg md:text-xl font-funnel mb-8 md:mb-12`}>
              Puzzle #{puzzleNumber}
            </p>
          )}

          {/* Game-specific instructions */}
          <div className="mb-12 md:mb-16">
            {children}
          </div>

          {/* Play button */}
          <Button
            onClick={onStart}
            size="lg"
            className={`${useDarkText ? 'bg-gray-900 text-white border-white' : 'bg-white text-neutral-900 border-neutral-900'} font-semibold px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl shadow-lg transition-all duration-200 font-funnel backdrop-blur-sm border border-solid hover:bg-white hover:text-[rgb(153,37,29)] hover:border-[rgb(153,37,29)] hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]`}
            style={{ borderRadius: 0 }}
          >
            <Play className="w-5 h-5 md:w-6 md:h-6 mr-3" />
            Start
          </Button>
        </div>
      </div>
    </div>
  )
}