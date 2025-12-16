"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameHeader } from "../game-header"
import { SiteFooter } from "@/components/site-footer"
import Link from "next/link"
import { Archive } from "lucide-react"
import { MorePuzzlesSection } from "../more-puzzles-section"

export default function BudgetBracketArchivedMessage() {
  return (
    <div className="game-container">
      <GameHeader 
        title="Budget Bracket" 
        showArchive={true}
        archiveUrl="/game/budget-bracket/archive"
      />
      
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-white border border-[rgb(var(--silver))] shadow-3d-grey" style={{ borderRadius: 0 }}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-neutral-900 font-funnel-display-bold">
                Archived (For Now)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm max-w-none text-neutral-700 font-funnel">
                <p>
                  Budget Bracket has been archived for now due to the complexities of creating a fun and challenging game. 
                  It was tedious to put good picks together that were interesting and not obvious while at the same time 
                  making the game fun, as it was kind of just guessing without much skill besides just knowing budgets.
                </p>
                <p>
                  However, you can still play all the past Budget Bracket puzzles from the archive! 
                  Browse through the calendar and relive your favorite budget battles.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  asChild
                  className="flex-1 bg-[rgb(39,134,70)] hover:bg-[rgb(55,160,90)] text-white border border-[rgb(39,134,70)]"
                  style={{ borderRadius: 0 }}
                >
                  <Link href="/game/budget-bracket/archive" className="flex items-center justify-center gap-2">
                    <Archive className="w-4 h-4" />
                    Play Archive
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <MorePuzzlesSection
            currentGameId="budget-bracket"
            title="More Games..."
            showArchiveRow={false}
            className="mt-0"
          />
        </div>
      </main>
      
      <SiteFooter />
    </div>
  )
}

