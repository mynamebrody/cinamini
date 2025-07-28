'use client'

import * as React from 'react'
import { Settings, X, Sun, Moon, Monitor, Eye } from 'lucide-react'
import { useCinaMiniTheme } from './theme-provider'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Switch } from './ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

interface GameSettingsProps {
  children?: React.ReactNode
  triggerClassName?: string
  onPause?: () => void
  isPaused?: boolean
}

export function GameSettings({ children, triggerClassName = '', onPause, isPaused }: GameSettingsProps) {
  const { theme, contrast, setTheme, setContrast } = useCinaMiniTheme()
  const [open, setOpen] = React.useState(false)
  
  const handlePause = () => {
    if (onPause) {
      onPause()
      setOpen(false) // Close settings when pausing
    }
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

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
          
          {/* Theme Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-2"
              >
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <div
                    key={value}
                    className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:border-primary"
                  >
                    <RadioGroupItem value={value} id={value} className="sr-only" />
                    <Label 
                      htmlFor={value} 
                      className="flex flex-col items-center gap-2 cursor-pointer w-full"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* High Contrast Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4" />
                  <div>
                    <Label htmlFor="high-contrast" className="text-sm font-medium">
                      High Contrast
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enhanced colors for better visibility
                    </p>
                  </div>
                </div>
                <Switch
                  id="high-contrast"
                  checked={contrast === 'high'}
                  onCheckedChange={(checked) => setContrast(checked ? 'high' : 'normal')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Game Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">About CinaMini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Daily movie puzzle games inspired by Wordle
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Version</span>
                <span>1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Today's Puzzle</span>
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
  const { theme, contrast, setTheme, setContrast } = useCinaMiniTheme()

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright interface' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes in low light' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Match your device preference' },
  ] as const

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Customize your CinaMini experience
        </p>
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Theme</Label>
            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
              className="mt-2"
            >
              {themeOptions.map(({ value, label, icon: Icon, description }) => (
                <div
                  key={value}
                  className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:border-primary"
                >
                  <RadioGroupItem value={value} id={`theme-${value}`} />
                  <Icon className="h-5 w-5" />
                  <div className="flex-1">
                    <Label htmlFor={`theme-${value}`} className="cursor-pointer">
                      <div className="font-medium">{label}</div>
                      <div className="text-sm text-muted-foreground">{description}</div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <div>
                <Label htmlFor="high-contrast-panel" className="font-medium">
                  High Contrast Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enhances color contrast for better visibility and accessibility
                </p>
              </div>
            </div>
            <Switch
              id="high-contrast-panel"
              checked={contrast === 'high'}
              onCheckedChange={(checked) => setContrast(checked ? 'high' : 'normal')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}