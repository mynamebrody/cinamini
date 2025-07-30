"use client"

import { useState } from "react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check, X } from "lucide-react"
import { toast } from "sonner"

interface ShareDrawerProps {
  shareText: string
  shareUrl?: string
  trigger?: React.ReactNode
  title?: string
  description?: string
}

export function ShareDrawer({
  shareText,
  shareUrl = "https://cinamini.app",
  trigger,
  title = "Share Your Results",
  description = "Share your score with friends!"
}: ShareDrawerProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullShareText = `${shareText}\n\n${shareUrl}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText)
      setCopied(true)
      toast.success("Copied to clipboard!")
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          url: shareUrl,
        })
        setOpen(false)
      } catch (err) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", err)
      }
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="primary" size="lg" className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share Results
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 py-6">
          {/* Share Text Preview */}
          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <pre className="whitespace-pre-wrap text-sm font-mono text-neutral-700">
              {fullShareText}
            </pre>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Copy to Clipboard */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            
            {/* Native Share (if available) */}
            {navigator.share && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleNativeShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share via...
              </Button>
            )}
          </div>
        </div>
        
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="lg">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}