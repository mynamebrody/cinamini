"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { 
  GameModal, 
  GameModalHeader, 
  GameModalTitle, 
  GameModalBody, 
  GameModalFooter 
} from "./game-modal"

interface HowToPlayModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  instructions: React.ReactNode
  onStart: () => void
}

export function HowToPlayModal({ 
  open, 
  onOpenChange, 
  title,
  instructions,
  onStart
}: HowToPlayModalProps) {
  const handleStart = () => {
    onStart()
    onOpenChange(false)
  }

  return (
    <GameModal open={open} onOpenChange={onOpenChange}>
      <GameModalHeader>
        <GameModalTitle>How to Play {title}</GameModalTitle>
      </GameModalHeader>
      <GameModalBody className="space-y-3">
        {instructions}
      </GameModalBody>
      <GameModalFooter>
        <Button 
          onClick={handleStart} 
          size="lg" 
          variant="primary" 
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Playing
        </Button>
      </GameModalFooter>
    </GameModal>
  )
}