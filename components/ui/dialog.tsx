"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange?.(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={handleBackdropClick}
      />
      
      {/* Dialog content */}
      <div className="relative z-[9999] animate-fade-in">
        {children}
      </div>
    </div>
  )
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white border-2 border-gray-300 shadow-[4px_4px_0px_0px_rgba(192,192,192,0.8),8px_8px_0px_0px_rgba(192,192,192,0.6),12px_12px_0px_0px_rgba(192,192,192,0.4)] p-6 w-full max-w-lg mx-4 relative",
          className
        )}
        style={{ borderRadius: 0 }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mb-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("text-xl font-semibold text-neutral-900", className)}
        {...props}
      >
        {children}
      </h2>
    )
  }
)
DialogTitle.displayName = "DialogTitle"

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}
        {...props}
      />
    )
  }
)
DialogFooter.displayName = "DialogFooter"

const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DialogTrigger.displayName = "DialogTrigger"

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription }