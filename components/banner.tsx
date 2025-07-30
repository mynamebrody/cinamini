'use client'

import { X } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"

interface BannerProps {
  message: string
  show?: boolean
  onDismiss?: () => void
  dismissible?: boolean
}

export function Banner({ message, show = true, onDismiss, dismissible = true }: BannerProps) {
  const [isVisible, setIsVisible] = useState(show)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div className="banner px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-white">
            {message}
          </p>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-white hover:bg-white/20 ml-4"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}