"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Clock, Target } from "lucide-react"

interface BudgetBracketHowToPlayProps {
  onStart: () => void
}

export default function BudgetBracketHowToPlay({ onStart }: BudgetBracketHowToPlayProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-6">
      <Card>
        <CardHeader className="text-center py-2">
          <CardTitle className="text-lg">How to Play Budget Bracket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Game Description */}
          <div className="text-center space-y-1">
            <p className="text-base text-muted-foreground">
              Test your knowledge of movie production budgets!
            </p>
            <p className="text-sm text-muted-foreground">
              Compare two movies and pick the one with the higher budget.
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
                  <h3 className="text-sm font-semibold mb-1">Compare Movies</h3>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll see two movie posters side by side. Click on the movie you think had the higher production budget.
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
                  <h3 className="text-sm font-semibold mb-1">Progress Through Rounds</h3>
                  <p className="text-xs text-muted-foreground">
                    Play through all 5 rounds of comparisons. Try to get them all correct!
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
                  <h3 className="text-sm font-semibold mb-1">Perfect Game</h3>
                  <p className="text-xs text-muted-foreground">
                    Get all 5 rounds correct for a perfect game and earn the Perfect Producer badge!
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
                <span>Big blockbusters often have budgets over $100 million</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Consider the year of release - budgets have increased over time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>CGI-heavy films typically cost more than dramas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Star power matters - A-list actors command higher budgets</span>
              </li>
            </ul>
          </div>

          {/* Game Features */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-card border rounded-lg">
              <Trophy className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-xs font-medium">Daily Challenge</p>
              <p className="text-xs text-muted-foreground">New movies every day</p>
            </div>
            <div className="text-center p-2 bg-card border rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-xs font-medium">Quick Games</p>
              <p className="text-xs text-muted-foreground">5 rounds, 2-3 minutes</p>
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