'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { GameSettingsButton } from './game-settings'

export function GameStyleDemo() {
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null)

  return (
    <div className="game-container">
      {/* Unified Game Header */}
      <header className="game-header">
        <Button variant="ghost" size="sm">
          ← Back
        </Button>
        <h1 className="game-title">Style Demo</h1>
        <GameSettingsButton />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Color Palette Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Game Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="game-tile" data-state="correct">✓</div>
                <div className="game-tile" data-state="present">~</div>
                <div className="game-tile" data-state="absent">✗</div>
              </div>
              <div className="space-y-2">
                <Badge className="bg-green-500 text-white">Correct Answer</Badge>
                <Badge className="bg-yellow-500 text-white">Partial Match</Badge>
                <Badge className="bg-gray-500 text-white">Incorrect</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Game Options */}
          <Card>
            <CardHeader>
              <CardTitle>Unified Button Styles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedOption(option)}
                  className={`game-button w-full ${
                    selectedOption === option 
                      ? option === 2 ? 'correct' : 'incorrect'
                      : ''
                  }`}
                >
                  Movie Option {option}
                  {selectedOption === option && (
                    <span className="ml-2">
                      {option === 2 ? '✓' : '✗'}
                    </span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Responsive Design Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Theme Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✓ Light/Dark/System theme support</p>
              <p>✓ High contrast mode for accessibility</p>
              <p>✓ Consistent Wordle-inspired design</p>
              <p>✓ Mobile-first responsive layout</p>
              <p>✓ Unified game header with settings</p>
              <p>✓ CSS custom properties for easy theming</p>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}