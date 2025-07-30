"use client"

import { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"

interface GameContainerProps {
  children: ReactNode
  title: string
  showStats?: boolean
  onStatsClick?: () => void
  showBackButton?: boolean
  backButtonText?: string
  onBackClick?: () => void
  className?: string
}

export function GameContainer({
  children,
  title,
  showStats = false,
  onStatsClick,
  showBackButton = true,
  backButtonText = "Home",
  onBackClick,
  className = ""
}: GameContainerProps) {
  const router = useRouter()
  
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.push("/")
    }
  }

  return (
    <div className={`game-container ${className}`}>
      <header className="game-header">
        {showBackButton ? (
          <Button variant="ghost" size="sm" onClick={handleBackClick}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backButtonText}
          </Button>
        ) : (
          <div></div>
        )}
        
        <h1 className="game-title">{title}</h1>
        
        <div className="flex items-center gap-2">
          {showStats && onStatsClick && (
            <Button variant="ghost" size="sm" onClick={onStatsClick}>
              <BarChart3 className="w-4 h-4" />
            </Button>
          )}
          <GameSettingsButton />
        </div>
      </header>
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}