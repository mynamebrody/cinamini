"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShareSectionProps {
  shareText: string
  shareUrl?: string
  className?: string
}

export function ShareSection({ 
  shareText, 
  shareUrl = "https://cinamini.app",
  className 
}: ShareSectionProps) {
  const [copied, setCopied] = useState(false)
  const fullShareText = `${shareText}\n\n${shareUrl}`

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", err)
      }
    } else {
      // Fallback to copy if native share is not available
      handleCopy()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText)
      setCopied(true)
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = fullShareText
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Fallback copy failed:", err)
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        onClick={handleNativeShare}
        variant="primary"
        size="lg"
        className="flex-1"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      <Button
        onClick={handleCopy}
        variant="outline"
        size="lg"
        className="min-w-[100px]"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </>
        )}
      </Button>
    </div>
  )
}