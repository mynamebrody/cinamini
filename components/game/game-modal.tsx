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
}

export function GameModal({ 
  open, 
  onOpenChange, 
  children, 
  className,
  showCloseButton = true
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
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal content */}
      <div className={cn(
        "relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in",
        className
      )}>
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
    <div className={cn("px-6 pt-6 pb-4 border-b border-neutral-200", className)}>
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
    <h2 className={cn("text-2xl font-bold text-center", className)}>
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
    <div className={cn("px-6 py-4 overflow-y-auto max-h-[70vh]", className)}>
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
    <div className={cn("px-6 py-4 border-t border-neutral-200", className)}>
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