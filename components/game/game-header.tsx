"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar } from "lucide-react"
import { GameSettingsButton } from "@/components/game-settings"
import { HelpIconButton } from "./game-modal"
import { cn } from "@/lib/utils"

interface GameHeaderProps {
  title: string
  onHelpClick?: () => void
  showHelp?: boolean
  showSettings?: boolean
  showArchive?: boolean
  archiveUrl?: string
  className?: string
  children?: React.ReactNode
}

export function GameHeader({ 
  title, 
  onHelpClick,
  showHelp = true,
  showSettings = true,
  showArchive = false,
  archiveUrl,
  className,
  children
}: GameHeaderProps) {
  const router = useRouter()

  return (
    <header className={cn(
      "border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Back button and Archive */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
            {showArchive && archiveUrl && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push(archiveUrl)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
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
        </div>
      </div>
    </header>
  )
}