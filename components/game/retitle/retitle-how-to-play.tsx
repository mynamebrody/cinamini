"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Languages, Flame, Target } from "lucide-react"

interface RetitleHowToPlayProps {
  onStart: () => void
}

export default function RetitleHowToPlay({ onStart }: RetitleHowToPlayProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How to Play Retitled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Description */}
          <div className="text-center space-y-2">
            <p className="text-lg text-muted-foreground">
              Guess movies from their foreign titles!
            </p>
            <p className="text-muted-foreground">
              Movies often have creative titles in different languages.
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
                <h3 className="font-semibold mb-1">See the Foreign Title</h3>
                <p className="text-sm text-muted-foreground">
                  You'll see a movie title in another language, along with the country flag.
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
                <h3 className="font-semibold mb-1">Choose the Original</h3>
                <p className="text-sm text-muted-foreground">
                  Select the correct English title from 4-5 movie options.
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
                <h3 className="font-semibold mb-1">Learn the Translation</h3>
                <p className="text-sm text-muted-foreground">
                  After guessing, discover what the foreign title means in English!
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
                <span>Look for cognates - words that sound similar in both languages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Some countries prefer descriptive titles over direct translations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Consider the movie genres - action films often keep similar themes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Pay attention to the flag - different regions have different naming styles</span>
              </li>
            </ul>
          </div>

          {/* Example */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Example</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇪🇸</span>
                <span className="font-medium">"Solo en Casa"</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This Spanish title literally means "Alone at Home"
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Answer:</span>{" "}
                <span className="font-medium">Home Alone</span>
              </p>
            </div>
          </div>

          {/* Game Features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-card border rounded-lg">
              <Globe className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Global Cinema</p>
              <p className="text-xs text-muted-foreground">Titles from around the world</p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <Languages className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Learn Languages</p>
              <p className="text-xs text-muted-foreground">Discover translations</p>
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