"use client"

import { useState, useEffect } from "react"
import { CheckCircle, X } from "lucide-react"

interface EmailConfirmationBannerProps {
  onDismiss?: () => void
}

export default function EmailConfirmationBanner({ onDismiss }: EmailConfirmationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-hide banner after 10 seconds
    const timer = setTimeout(() => {
      handleDismiss()
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800">Email Confirmed!</h3>
            <p className="text-green-700 text-sm">
              Welcome to cinamini! Your email has been successfully verified and your account is now active.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-green-600 hover:text-green-800 transition-colors"
          aria-label="Dismiss confirmation message"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}