"use client"

import { ReactNode } from "react"

interface GameStatsLayoutProps {
  children: ReactNode
  className?: string
}

export function GameStatsLayout({ children, className = "" }: GameStatsLayoutProps) {
  return (
    <div className={`max-w-md mx-auto p-4 ${className}`}>
      {children}
    </div>
  )
}