"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Timer, Target } from "lucide-react"

interface PosterPixelsHowToPlayProps {
  onStart: () => void
}

export default function PosterPixelsHowToPlay({ onStart }: PosterPixelsHowToPlayProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-6">
      <Card>
        <CardHeader className="text-center py-2">
          <CardTitle className="text-lg">How to Play Poster Pixels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Game Description */}
          <div className="text-center space-y-1">
            <p className="text-base text-muted-foreground">
              Identify movies from pixelated posters!
            </p>
            <p className="text-sm text-muted-foreground">
              The poster slowly becomes clearer over time.
            </p>
          </div>

          {/* How to Play Steps */}
          <div className="space-y-2">
            <Card style={{ borderRadius: 0 }} className="p-3 shadow-3d-grey">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 flex items-center justify-center shadow-3d-grey" style={{ borderRadius: 0 }}>
                    <span className="text-base font-semibold">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold mb-1">Start Pixelated</h3>
                  <p className="text-xs text-muted-foreground">
                    The movie poster starts at 1% clarity - extremely pixelated and hard to see.
                  </p>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 0 }} className="p-3 shadow-3d-grey">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 flex items-center justify-center shadow-3d-grey" style={{ borderRadius: 0 }}>
                    <span className="text-base font-semibold">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold mb-1">Gradually Clears</h3>
                  <p className="text-xs text-muted-foreground">
                    Every 5 seconds, the poster becomes 3-5% clearer. Watch for shapes and colors!
                  </p>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 0 }} className="p-3 shadow-3d-grey">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 flex items-center justify-center shadow-3d-grey" style={{ borderRadius: 0 }}>
                    <span className="text-base font-semibold">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold mb-1">Guess Early</h3>
                  <p className="text-xs text-muted-foreground">
                    The sooner you guess correctly, the better your score. One guess only!
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tips */}
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-3 h-3" />
              Pro Tips
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
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
          <Card style={{ borderRadius: 0 }} className="p-3 space-y-2 shadow-3d-grey">
            <h3 className="text-sm font-semibold">Clarity Levels</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between p-1 bg-red-50" style={{ borderRadius: 0 }}>
                <span className="text-xs">1-20% Clarity</span>
                <span className="text-xs font-medium text-cinema-red">Very Hard</span>
              </div>
              <div className="flex items-center justify-between p-1 bg-orange-50" style={{ borderRadius: 0 }}>
                <span className="text-xs">20-40% Clarity</span>
                <span className="text-xs font-medium text-orange-600">Hard</span>
              </div>
              <div className="flex items-center justify-between p-1 bg-yellow-50" style={{ borderRadius: 0 }}>
                <span className="text-xs">40-60% Clarity</span>
                <span className="text-xs font-medium text-yellow-600">Medium</span>
              </div>
              <div className="flex items-center justify-between p-1 bg-green-50" style={{ borderRadius: 0 }}>
                <span className="text-xs">60%+ Clarity</span>
                <span className="text-xs font-medium text-green-600">Easy</span>
              </div>
            </div>
          </Card>

          {/* Game Features */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-card border rounded-lg">
              <Timer className="w-6 h-6 mx-auto mb-1 text-orange-500" />
              <p className="text-xs font-medium">Time Pressure</p>
              <p className="text-xs text-muted-foreground">Guess fast for high scores</p>
            </div>
            <div className="text-center p-2 bg-card border rounded-lg">
              <Search className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-xs font-medium">One Chance</p>
              <p className="text-xs text-muted-foreground">Make it count!</p>
            </div>
          </div>

          {/* Start Button */}
          <Button onClick={onStart} variant="primary" size="default" className="w-full">
            Start Playing
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}