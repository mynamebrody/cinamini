"use client"

import React from "react"

interface InstructionCardProps {
  step: number
  title: string
  description: string
  example?: React.ReactNode
  className?: string
  darkTheme?: boolean // For light backgrounds that need dark text
}

export function InstructionCard({ 
  step, 
  title, 
  description, 
  example,
  className = "",
  darkTheme = false
}: InstructionCardProps) {
  return (
    <div className={`${darkTheme ? 'bg-[#3a3a3c]/10 border-[#3a3a3c]/20' : 'bg-white/10 border-white/20'} backdrop-blur-sm p-6 md:p-8 border shadow-3d-grey ${className}`} style={{ borderRadius: 0 }}>
      {/* Step number */}
      <div className="flex items-center mb-4">
        <div className={`w-8 h-8 md:w-10 md:h-10 bg-white text-[#3a3a3c] border border-[#d1d2d4] flex items-center justify-center font-bold text-sm md:text-base font-funnel mr-4 shadow-3d-grey`} style={{ borderRadius: 0 }}>
          {step}
        </div>
        <h3 className={`text-lg md:text-xl font-semibold ${darkTheme ? 'text-[#3a3a3c]' : 'text-white'} font-funnel`}>
          {title}
        </h3>
      </div>

      {/* Description */}
      <p className={`${darkTheme ? 'text-[#3a3a3c]/80' : 'text-white/90'} text-sm md:text-base font-funnel leading-relaxed mb-4`}>
        {description}
      </p>

      {/* Example content */}
      {example && (
        <div className={`${darkTheme ? 'bg-[#3a3a3c]/5 border-[#3a3a3c]/10' : 'bg-white/5 border-white/10'} p-4 border shadow-3d-grey`} style={{ borderRadius: 0 }}>
          {example}
        </div>
      )}
    </div>
  )
}

interface InstructionGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
}

export function InstructionGrid({ children, columns = 1 }: InstructionGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2", 
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-6 md:gap-8`}>
      {children}
    </div>
  )
}