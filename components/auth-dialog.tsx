"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Film, Users, Trophy, Clock } from "lucide-react"

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  gameName: string
}

export default function AuthDialog({ isOpen, onClose, gameName }: AuthDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Ready to Play {gameName}?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto" style={{ borderRadius: 0 }}>
              <Film className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Join thousands of movie fans testing their cinema knowledge daily!
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 flex items-center justify-center" style={{ borderRadius: 0 }}>
                <Trophy className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Track Your Progress</p>
                <p className="text-sm text-muted-foreground">Build streaks and earn achievements</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center" style={{ borderRadius: 0 }}>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Compare with Friends</p>
                <p className="text-sm text-muted-foreground">Share results and compete</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Daily Challenges</p>
                <p className="text-sm text-muted-foreground">Fresh puzzles every day</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <Button asChild variant="primary" size="lg" className="w-full">
              <a href="/auth/sign-up">Create Free Account</a>
            </Button>
            
            <Button asChild variant="ghost" size="lg" className="w-full">
              <a href="/auth/login">Already have an account? Sign in</a>
            </Button>
          </div>

          <p className="text-xs text-center text-neutral-500">
            Free forever • No ads • Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}