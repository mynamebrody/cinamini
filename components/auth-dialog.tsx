"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Film, Users, Trophy, Clock } from "lucide-react"

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  gameName: string
}

export default function AuthDialog({ isOpen, onClose, gameName }: AuthDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#1c1c1c] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Ready to Play {gameName}?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-[#B31B1B]/20 rounded-full flex items-center justify-center mx-auto">
              <Film className="w-8 h-8 text-[#B31B1B]" />
            </div>
            <p className="text-gray-300">
              Create an account to play daily puzzles, track your progress, and compete with other movie fans!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Card className="bg-[#2a2a2a] border-white/10 p-3 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-white/90">Track Progress</div>
            </Card>
            <Card className="bg-[#2a2a2a] border-white/10 p-3 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-white/90">Join Community</div>
            </Card>
          </div>

          <div className="space-y-2">
            <Button 
              asChild 
              className="w-full bg-[#B31B1B] hover:bg-[#9A1A1A] text-white"
              size="lg"
            >
              <a href="/auth/sign-up">Create Account</a>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <a href="/auth/login">Already have an account? Sign In</a>
            </Button>
          </div>

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}