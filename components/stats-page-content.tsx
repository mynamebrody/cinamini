"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CastClimbStats from "@/components/game/cast-climb/cast-climb-stats"
import RetitleStats from "@/components/game/retitle/retitle-stats"
import BudgetBracketStats from "@/components/game/budget-bracket/budget-bracket-stats"
import PosterPixelsStats from "@/components/game/poster-pixels/poster-pixels-stats"

export default function StatsPageContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <p className="text-neutral-600">Track your progress across all cinamini games</p>
      </div>

      {/* Stats Tabs */}
      <Tabs defaultValue="cast-climb" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cast-climb">Cast Climb</TabsTrigger>
          <TabsTrigger value="retitled">Retitled</TabsTrigger>
          <TabsTrigger value="budget-bracket">Budget Bracket</TabsTrigger>
          <TabsTrigger value="poster-pixels">Poster Pixels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cast-climb" className="mt-6">
          <CastClimbStats />
        </TabsContent>
        
        <TabsContent value="retitled" className="mt-6">
          <RetitleStats />
        </TabsContent>
        
        <TabsContent value="budget-bracket" className="mt-6">
          <BudgetBracketStats />
        </TabsContent>
        
        <TabsContent value="poster-pixels" className="mt-6">
          <PosterPixelsStats />
        </TabsContent>
      </Tabs>
    </div>
  )
}