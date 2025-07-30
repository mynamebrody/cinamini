"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Search, Timer, Target } from "lucide-react"

interface PosterPixelsHowToPlayProps {
  onStart: () => void
}

export default function PosterPixelsHowToPlay({ onStart }: PosterPixelsHowToPlayProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How to Play Poster Pixels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Description */}
          <div className="text-center space-y-2">
            <p className="text-lg text-muted-foreground">
              Identify movies from pixelated posters!
            </p>
            <p className="text-muted-foreground">
              The poster slowly becomes clearer over time.
            </p>
          </div>

          {/* How to Play Steps */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold">1</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Start Pixelated</h3>
                <p className="text-sm text-muted-foreground">
                  The movie poster starts at 1% clarity - extremely pixelated and hard to see.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold">2</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Gradually Clears</h3>
                <p className="text-sm text-muted-foreground">
                  Every 5 seconds, the poster becomes 3-5% clearer. Watch for shapes and colors!
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold">3</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Guess Early</h3>
                <p className="text-sm text-muted-foreground">
                  The sooner you guess correctly, the better your score. One guess only!
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Pro Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Look for distinctive colors and shapes early on</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Famous movie posters often have iconic layouts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Text becomes readable around 40-50% clarity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>If stuck, wait for more clarity - but your score decreases!</span>
              </li>
            </ul>
          </div>

          {/* Clarity Examples */}
          <div className="space-y-3">
            <h3 className="font-semibold">Clarity Levels</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-sm">1-20% Clarity</span>
                <span className="text-sm font-medium text-red-600">Very Hard</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                <span className="text-sm">20-40% Clarity</span>
                <span className="text-sm font-medium text-orange-600">Hard</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="text-sm">40-60% Clarity</span>
                <span className="text-sm font-medium text-yellow-600">Medium</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-sm">60%+ Clarity</span>
                <span className="text-sm font-medium text-green-600">Easy</span>
              </div>
            </div>
          </div>

          {/* Game Features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-card border rounded-lg">
              <Timer className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium">Time Pressure</p>
              <p className="text-xs text-muted-foreground">Guess fast for high scores</p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <Search className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">One Chance</p>
              <p className="text-xs text-muted-foreground">Make it count!</p>
            </div>
          </div>

          {/* Start Button */}
          <Button onClick={onStart} variant="primary" size="lg" className="w-full">
            Start Playing
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}