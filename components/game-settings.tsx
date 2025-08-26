'use client'

import * as React from 'react'
import { Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

interface GameSettingsProps {
  children?: React.ReactNode
  triggerClassName?: string
  onPause?: () => void
  isPaused?: boolean
}

export function GameSettings({ children, triggerClassName = '', onPause, isPaused }: GameSettingsProps) {
  const [open, setOpen] = React.useState(false)
  
  const handlePause = () => {
    if (onPause) {
      onPause()
      setOpen(false) // Close settings when pausing
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="ghost" 
            size="icon"
            className={`text-current hover:bg-current/10 ${triggerClassName}`}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Pause Game (only show during gameplay) */}
          {onPause && !isPaused && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Game Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handlePause} variant="outline" className="w-full">
                  Pause Game
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Game Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">About cinamini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Daily movie puzzle games for cinema enthusiasts
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Version</span>
                <span>1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Today&apos;s Puzzle</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Compact version for in-game headers
export function GameSettingsButton({ 
  className = '', 
  onPause, 
  isPaused 
}: { 
  className?: string
  onPause?: () => void
  isPaused?: boolean
}) {
  return (
    <GameSettings triggerClassName={className} onPause={onPause} isPaused={isPaused}>
      <Button
        variant="ghost"
        size="icon"
        className={`text-current hover:bg-current/10 ${className}`}
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </GameSettings>
  )
}

// Full settings panel for dedicated settings pages
export function GameSettingsPanel() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Customize your cinamini experience
        </p>
      </div>

      {/* Game Info */}
      <Card>
        <CardHeader>
          <CardTitle>About cinamini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground">
              cinamini brings you daily movie puzzle games designed for cinema enthusiasts. 
              Test your film knowledge with our variety of challenging and fun games.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Today&apos;s Puzzle</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Need Help?</h4>
            <p className="text-sm text-muted-foreground">
              If you encounter any issues or have suggestions, please contact us.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">Feedback</h4>
            <p className="text-sm text-muted-foreground">
              We&apos;d love to hear your thoughts on how we can improve cinamini.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}