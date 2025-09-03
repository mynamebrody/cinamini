'use client'

import { useEffect, useState } from "react"
import Cookies from "js-cookie"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BannerProps {
  id: string
  children: React.ReactNode
  show?: boolean
  dismissible?: boolean
  className?: string
  onDismiss?: () => void
}

export function Banner({ id, children, show = true, dismissible = true, className, onDismiss }: BannerProps) {
  const cookieKey = `cinamini_banner_${id}_dismissed`
  const [visible, setVisible] = useState(true)
  const [render, setRender] = useState(false)
  // Local slide animation only; banner is in normal flow so it scrolls away with the page

  useEffect(() => {
    if (!show) return
    const dismissed = Cookies.get(cookieKey) === 'true'
    // Render immediately if not dismissed; keep visible so there is no slide-in
    setRender(!dismissed)
    setVisible(true)
  }, [cookieKey, show])

  const handleDismiss = () => {
    setVisible(false)
    Cookies.set(cookieKey, 'true', { expires: 30 })
    onDismiss?.()
    setTimeout(() => setRender(false), 250)
  }

  if (!render) return null

  return (
    <>
      {/* In-flow banner (animates in once, scrolls with page) */}
      <div
        className={cn(
          visible ? "" : "transition-transform duration-200 -translate-y-full",
          className
        )}
      >
        <div className="bg-[#3a3a3c] text-white border-b border-black/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 relative flex items-center justify-center">
            <div className="text-sm text-center">
              {children}
            </div>
            {dismissible && (
              <button onClick={handleDismiss} className="p-1 hover:opacity-80 absolute right-4 top-1/2 -translate-y-1/2" aria-label="Dismiss banner">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}