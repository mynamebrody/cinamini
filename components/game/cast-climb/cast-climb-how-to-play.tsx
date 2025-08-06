"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Search, Star, Target } from "lucide-react"

interface CastClimbHowToPlayProps {
  onStart: () => void
}

export default function CastClimbHowToPlay({ onStart }: CastClimbHowToPlayProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How to Play Cast Climb</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Description */}
          <div className="text-center space-y-2">
            <p className="text-lg text-muted-foreground">
              Guess the movie from its cast members!
            </p>
            <p className="text-muted-foreground">
              Actors are revealed one by one, from supporting cast to leads.
            </p>
          </div>

          {/* How to Play Steps */}
          <div className="space-y-4">
            <Card style={{ borderRadius: 0 }} className="p-4 shadow-3d-grey">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shadow-3d-grey" style={{ borderRadius: 0 }}>
                    <span className="text-lg font-semibold">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">First Actor Revealed</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll see one actor's name and their character. Try to guess the movie!
                  </p>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 0 }} className="p-4 shadow-3d-grey">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shadow-3d-grey" style={{ borderRadius: 0 }}>
                    <span className="text-lg font-semibold">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Search and Guess</h3>
                  <p className="text-sm text-muted-foreground">
                    Search for the movie title. Wrong guess? The next actor will be revealed.
                  </p>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 0 }} className="p-4 shadow-3d-grey">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shadow-3d-grey" style={{ borderRadius: 0 }}>
                    <span className="text-lg font-semibold">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Up to 4 Actors</h3>
                  <p className="text-sm text-muted-foreground">
                    You have up to 4 chances. The lead actors are revealed last to make it easier!
                  </p>
                </div>
              </div>
            </Card>
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
                <span>Pay attention to character names - they can be big clues!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Think about which movies actors have appeared in together</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Supporting actors often appear in specific genres</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>The faster you guess, the better your score!</span>
              </li>
            </ul>
          </div>

          {/* Scoring System */}
          <Card style={{ borderRadius: 0 }} className="p-4 space-y-3 shadow-3d-grey">
            <h3 className="font-semibold">Scoring</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-yellow-50" style={{ borderRadius: 0 }}>
                <span className="text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-600" />
                  Guess with 1 actor
                </span>
                <span className="text-sm font-semibold">Perfect!</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50" style={{ borderRadius: 0 }}>
                <span className="text-sm flex items-center gap-2">
                  <span className="text-blue-600">✨</span>
                  Guess with 2 actors
                </span>
                <span className="text-sm font-semibold">Great!</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50" style={{ borderRadius: 0 }}>
                <span className="text-sm flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Guess with 3-4 actors
                </span>
                <span className="text-sm font-semibold">Good!</span>
              </div>
            </div>
          </Card>

          {/* Game Features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-card border rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">4 Actors Max</p>
              <p className="text-xs text-muted-foreground">Supporting → Leads</p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <Search className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Search Movies</p>
              <p className="text-xs text-muted-foreground">Type to find titles</p>
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