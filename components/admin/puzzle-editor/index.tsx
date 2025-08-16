"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { DollarSign, Film, Users, Palette } from "lucide-react"
import RetitledEditor from "./retitled-editor"
import BudgetBracketEditor from "./budget-bracket-editor"
import CastClimbEditor from "./cast-climb-editor"
import PosterPixelsEditor from "./poster-pixels-editor"

export default function PuzzleEditor() {
  const [activeTab, setActiveTab] = useState("retitled")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-funnel-display-bold text-neutral-900">Puzzle Editor</h1>
        <p className="text-neutral-600 mt-2 font-funnel">Create and manage puzzles for all cinamini games</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-white border-2 border-neutral-200" style={{
          boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.05)',
          borderRadius: 0
        }}>
          <TabsTrigger 
            value="retitled" 
            className="flex items-center gap-2 py-3 px-4 font-funnel font-medium border-r-2 border-neutral-200 data-[state=active]:bg-white data-[state=active]:text-cinema-red data-[state=active]:border-cinema-red hover:bg-neutral-50 hover:text-cinema-charcoal transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            <Film className="w-4 h-4" />
            <span>Retitled</span>
          </TabsTrigger>
          <TabsTrigger 
            value="budget-bracket" 
            className="flex items-center gap-2 py-3 px-4 font-funnel font-medium border-r-2 border-neutral-200 data-[state=active]:bg-white data-[state=active]:text-cinema-red data-[state=active]:border-cinema-red hover:bg-neutral-50 hover:text-cinema-charcoal transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            <DollarSign className="w-4 h-4" />
            <span>Budget Bracket</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cast-climb" 
            className="flex items-center gap-2 py-3 px-4 font-funnel font-medium border-r-2 border-neutral-200 data-[state=active]:bg-white data-[state=active]:text-cinema-red data-[state=active]:border-cinema-red hover:bg-neutral-50 hover:text-cinema-charcoal transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            <Users className="w-4 h-4" />
            <span>Cast Climb</span>
          </TabsTrigger>
          <TabsTrigger 
            value="poster-pixels" 
            className="flex items-center gap-2 py-3 px-4 font-funnel font-medium data-[state=active]:bg-cinema-red data-[state=active]:text-white data-[state=active]:border-cinema-red hover:bg-neutral-50 transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            <Palette className="w-4 h-4" />
            <span>Poster Pixels</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="retitled" className="space-y-6 mt-0">
            <Card className="admin-card p-6">
              <RetitledEditor />
            </Card>
          </TabsContent>

          <TabsContent value="budget-bracket" className="space-y-6 mt-0">
            <Card className="admin-card p-6">
              <BudgetBracketEditor />
            </Card>
          </TabsContent>

          <TabsContent value="cast-climb" className="space-y-6 mt-0">
            <Card className="admin-card p-6">
              <CastClimbEditor />
            </Card>
          </TabsContent>

          <TabsContent value="poster-pixels" className="space-y-6 mt-0">
            <Card className="admin-card p-6">
              <PosterPixelsEditor />
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}