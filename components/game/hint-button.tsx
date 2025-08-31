"use client"

import { useState } from "react"
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface HintButtonProps {
  hint: string | null | undefined
  onHintUsed?: () => void
  className?: string
  position?: "inline" | "floating"
  expandable?: boolean
  maxLength?: number
}

export function HintButton({ 
  hint, 
  onHintUsed, 
  className,
  position = "inline",
  expandable = true,
  maxLength = 150
}: HintButtonProps) {
  const [showHint, setShowHint] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Don't render if no hint is available
  if (!hint || hint.trim() === "") {
    return null
  }

  const needsExpansion = expandable && hint.length > maxLength
  const displayHint = needsExpansion && !expanded 
    ? hint.substring(0, maxLength) + "..." 
    : hint

  const handleShowHint = () => {
    if (!showHint) {
      setShowHint(true)
      onHintUsed?.()
    } else {
      setShowHint(false)
      setExpanded(false)
    }
  }

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        onClick={handleShowHint}
        className={cn(
          "group relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150",
          "bg-white border-2 border-gray-300 text-gray-700",
          "hover:border-[#99251d] hover:-translate-y-[2px]",
          "shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212)]",
          "hover:shadow-[2px_2px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29),6px_6px_0px_rgb(153,37,29),8px_8px_0px_rgb(153,37,29)]",
          "active:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]",
          "active:translate-x-[2px] active:translate-y-[2px]",
          showHint && "border-[#99251d] bg-[#99251d] text-white shadow-[2px_2px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]"
        )}
        aria-expanded={showHint}
        aria-label={showHint ? "Hide hint" : "Show hint"}
      >
        <Lightbulb className="w-4 h-4" />
        <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
      </button>

      {showHint && (
        <div 
          className={cn(
            "p-4 rounded-lg border-2 border-[#99251d] bg-[#fef9f3] animate-in fade-in slide-in-from-top-2 duration-200",
            "shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29)]",
            position === "floating" && "absolute z-10 w-full max-w-md mt-2"
          )}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-[#99251d] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#99251d] mb-1">Hint:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {displayHint}
              </p>
              {needsExpansion && (
                <button
                  onClick={handleExpand}
                  className="mt-2 flex items-center gap-1 text-xs text-[#99251d] hover:text-[#7a1d16] font-medium transition-colors"
                  aria-label={expanded ? "Show less" : "Show more"}
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}