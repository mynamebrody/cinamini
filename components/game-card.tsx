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
  style = { emoji: '🎬', bgColor: '#6b7280', textColor: 'white' }
}: GameCardProps) {
  const router = useRouter()

  const handlePlay = () => {
    router.push(`/game/${id}`)
  }

  return (
    <div 
      className="group overflow-hidden cursor-pointer hover:scale-[1.03] bg-white transition-all duration-300"
      style={{
        boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.15)'
      }}
      onClick={handlePlay}
    >
      {/* Colored Header */}
      <div 
        className="h-32 flex items-center justify-center relative"
        style={{ backgroundColor: style.bgColor }}
      >
        <div className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
          {style.emoji}
        </div>
        
        {/* Play Status Badge */}
        {hasPlayedToday && (
          <div className="absolute top-4 right-4">
            <div className="bg-white/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
              <span className="text-xs font-semibold text-white font-funnel">
                ✓ Completed
              </span>
            </div>
          </div>
        )}
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Game Name */}
        <h3 className="text-2xl font-bold text-neutral-900 mb-4 font-funnel-display-bold tracking-tight">
          {name}
        </h3>
        
        {/* Game Description */}
        <p className="text-neutral-600 text-base font-funnel leading-relaxed mb-6 line-clamp-3">
          {description}
        </p>
        
        {/* Play Button */}
        <Button
          variant="outline"
          size="default"
          className="w-full border-2 border-neutral-300 font-semibold font-funnel text-neutral-700 transition-all duration-200 py-3 rounded-xl group-hover:bg-neutral-900 group-hover:text-white group-hover:border-neutral-900 hover:scale-[1.02]"
          onClick={(e) => {
            e.stopPropagation()
            handlePlay()
          }}
        >
          {hasPlayedToday ? 'View Results' : 'Play Today'}
        </Button>
      </div>
    </div>
  )
}