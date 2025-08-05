"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface GameCardProps {
  id: string
  name: string
  description: string
  hasPlayedToday: boolean
  isAuthenticated?: boolean
  style?: {
    emoji: string
    bgColor: string
    textColor?: string
  }
}

export default function GameCard({ 
  id, 
  name, 
  description, 
  hasPlayedToday, 
  isAuthenticated = false,
  style = { emoji: '🎬', bgColor: '#6b7280' }
}: GameCardProps) {
  const router = useRouter()

  const handlePlay = () => {
    router.push(`/game/${id}`)
  }

  return (
    <div 
      className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      style={{ backgroundColor: style.bgColor }}
      onClick={handlePlay}
    >
      <div className="p-6 text-center">
        {/* Emoji Icon */}
        <div className="text-5xl mb-4">{style.emoji}</div>
        
        {/* Game Name */}
        <h3 className={cn(
          "text-xl font-bold mb-4",
          style.textColor || "text-white"
        )}>
          {name}
        </h3>
        
        {/* Play Button */}
        <Button
          variant="secondary"
          size="sm"
          className="bg-white/90 hover:bg-white text-neutral-900 font-semibold"
          onClick={(e) => {
            e.stopPropagation()
            handlePlay()
          }}
        >
          Play
        </Button>
        
        {/* Archive link for completed games */}
        {hasPlayedToday && (
          <p className={cn(
            "text-sm mt-2",
            style.textColor || "text-white/80"
          )}>
            Past Puzzles
          </p>
        )}
      </div>
    </div>
  )
}