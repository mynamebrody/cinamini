"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"
import { HelpIconButton } from "./game-modal"
import { cn } from "@/lib/utils"

interface GameHeaderProps {
  title: string
  onHelpClick?: () => void
  showHelp?: boolean
  showSettings?: boolean
  className?: string
  children?: React.ReactNode
}

export function GameHeader({ 
  title, 
  onHelpClick,
  showHelp = true,
  showSettings = true,
  className,
  children
}: GameHeaderProps) {
  const router = useRouter()

  return (
    <header className={cn(
      "game-header",
      className
    )}>
      {/* Left side - Back button */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
      </div>

      {/* Center - Title */}
      <h1 className="game-title absolute left-1/2 transform -translate-x-1/2">
        {title}
      </h1>

      {/* Right side - Help and Settings */}
      <div className="flex items-center gap-1">
        {showHelp && onHelpClick && (
          <HelpIconButton onClick={onHelpClick} />
        )}
        {showSettings && (
          <GameSettingsButton />
        )}
        {children}
      </div>
    </header>
  )
}