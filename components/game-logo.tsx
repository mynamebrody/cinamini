"use client"

import Image from "next/image"
import { useState } from "react"

interface GameLogoProps {
  logo?: string
  logoPng?: string
  emoji?: string
  alt: string
  width: number
  height: number
  className?: string
}

export function GameLogo({ logo, logoPng, emoji, alt, width, height, className }: GameLogoProps) {
  const [useBackup, setUseBackup] = useState(false)

  if (logo && !useBackup) {
    return (
      <Image
        src={logo}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => {
          if (logoPng) {
            setUseBackup(true)
          }
        }}
      />
    )
  }

  if (logoPng && useBackup) {
    return (
      <Image
        src={logoPng}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    )
  }

  if (emoji) {
    return (
      <div className={`flex items-center justify-center ${className?.includes('text-') ? className : `text-[${width/4}px]`}`}>
        {emoji}
      </div>
    )
  }

  return null
}