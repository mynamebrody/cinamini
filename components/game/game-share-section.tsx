"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface GameShareSectionProps {
  shareText: string
  shareUrl?: string
  onShare?: () => void
  className?: string
}

export function GameShareSection({ 
  shareText, 
  shareUrl = "https://cinamini.app",
  onShare,
  className = "" 
}: GameShareSectionProps) {
  const [copying, setCopying] = useState(false)
  
  const fullShareText = `${shareText}\n\nPlay at ${shareUrl}`

  const handleShare = async () => {
    if (onShare) {
      onShare()
      return
    }
    
    try {
      // Try native share first on mobile
      if (navigator.share && /mobile/i.test(navigator.userAgent)) {
        await navigator.share({
          text: shareText,
          url: shareUrl
        })
      } else {
        // Fallback to copy
        await handleCopy()
      }
    } catch (error) {
      console.error('Share failed:', error)
      // If share fails, copy instead
      await handleCopy()
    }
  }

  const handleCopy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(fullShareText)
      toast.success("Copied to clipboard!")
      
      // Reset after 2 seconds
      setTimeout(() => setCopying(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error("Failed to copy to clipboard")
      setCopying(false)
    }
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button 
        onClick={handleShare}
        variant="primary"
        size="lg"
        className="flex-1"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Results
      </Button>
      
      <Button
        onClick={handleCopy}
        variant="outline"
        size="lg"
        disabled={copying}
      >
        {copying ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  )
}