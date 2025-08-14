"use client"

import React, { useEffect } from "react"
import { X, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
  backdropColor?: string // Custom backdrop color for game-specific themes
}

export function GameModal({ 
  open, 
  onOpenChange, 
  children, 
  className,
  showCloseButton = true,
  backdropColor
}: GameModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Handle ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    
    document.addEventListener('keydown', handleEsc)
    
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
        style={{
          backgroundColor: backdropColor || 'rgba(0, 0, 0, 0.3)'
        }}
      />
      
      {/* Modal content */}
      <div className={cn(
        "relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in",
        "border border-[#3a3a3c]",
        "shadow-[2px_2px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60),6px_6px_0px_rgb(58,58,60),8px_8px_0px_rgb(58,58,60)]",
        className
      )}
      style={{ borderRadius: 0 }}>
        {showCloseButton && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 bg-transparent border border-transparent hover:bg-transparent hover:border-[rgb(153,37,29)] hover:text-[rgb(153,37,29)] hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)] transition-all z-10"
            style={{ borderRadius: 0 }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

interface GameModalHeaderProps {
  children: React.ReactNode
  className?: string
}

export function GameModalHeader({ children, className }: GameModalHeaderProps) {
  return (
    <div className={cn("px-5 pt-4 pb-3 border-b border-neutral-200", className)}>
      {children}
    </div>
  )
}

interface GameModalTitleProps {
  children: React.ReactNode
  className?: string
}

export function GameModalTitle({ children, className }: GameModalTitleProps) {
  return (
    <h2 className={cn("text-xl font-bold text-center", className)}>
      {children}
    </h2>
  )
}

interface GameModalBodyProps {
  children: React.ReactNode
  className?: string
}

export function GameModalBody({ children, className }: GameModalBodyProps) {
  return (
    <div className={cn("px-5 py-4 overflow-y-auto max-h-[70vh]", className)}>
      {children}
    </div>
  )
}

interface GameModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function GameModalFooter({ children, className }: GameModalFooterProps) {
  return (
    <div className={cn("px-5 py-3 border-t border-neutral-200", className)}>
      {children}
    </div>
  )
}

// Help Icon Button for triggering How to Play modal
interface HelpIconButtonProps {
  onClick: () => void
  className?: string
}

export function HelpIconButton({ onClick, className }: HelpIconButtonProps) {
  return (
    <Button
      variant="icon"
      onClick={onClick}
      className={className}
      aria-label="How to play"
    >
      <HelpCircle className="w-5 h-5" />
    </Button>
  )
}