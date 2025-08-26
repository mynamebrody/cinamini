"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Languages, Target } from "lucide-react"

interface RetitleHowToPlayProps {
  onStart: () => void
}

export default function RetitleHowToPlay({ onStart }: RetitleHowToPlayProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-6">
      <Card>
        <CardHeader className="text-center py-2">
          <CardTitle className="text-lg">How to Play Retitled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Game Description */}
          <div className="text-center space-y-1">
            <p className="text-base text-muted-foreground">
              Guess movies from their foreign titles!
            </p>
            <p className="text-sm text-muted-foreground">
              Movies often have creative titles in different languages.
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
                  <h3 className="text-sm font-semibold mb-1">See the Foreign Title</h3>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll see a movie title in another language, along with the country flag.
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
                  <h3 className="text-sm font-semibold mb-1">Choose the Original</h3>
                  <p className="text-xs text-muted-foreground">
                    Select the correct English title from 4-5 movie options.
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
                  <h3 className="text-sm font-semibold mb-1">Learn the Translation</h3>
                  <p className="text-xs text-muted-foreground">
                    After guessing, discover what the foreign title means in English!
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
          <Card style={{ borderRadius: 0 }} className="p-3 space-y-2 shadow-3d-grey">
            <h3 className="text-sm font-semibold">Example</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇪🇸</span>
                <span className="text-sm font-medium">&quot;Solo en Casa&quot;</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This Spanish title literally means &quot;Alone at Home&quot;
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">Answer:</span>{" "}
                <span className="font-medium">Home Alone</span>
              </p>
            </div>
          </Card>

          {/* Game Features */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-card border rounded-lg">
              <Globe className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-xs font-medium">Global Cinema</p>
              <p className="text-xs text-muted-foreground">Titles from around the world</p>
            </div>
            <div className="text-center p-2 bg-card border rounded-lg">
              <Languages className="w-6 h-6 mx-auto mb-1 text-green-500" />
              <p className="text-xs font-medium">Learn Languages</p>
              <p className="text-xs text-muted-foreground">Discover translations</p>
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