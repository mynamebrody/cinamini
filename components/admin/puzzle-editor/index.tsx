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
        <h1 className="text-3xl font-bold text-gray-900">Puzzle Editor</h1>
        <p className="text-gray-600 mt-2">Create and manage puzzles for all CinaMini games</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100">
          <TabsTrigger 
            value="retitled" 
            className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Film className="w-4 h-4" />
            <span>Retitled</span>
          </TabsTrigger>
          <TabsTrigger 
            value="budget-bracket" 
            className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <DollarSign className="w-4 h-4" />
            <span>Budget Bracket</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cast-climb" 
            className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>Cast Climb</span>
          </TabsTrigger>
          <TabsTrigger 
            value="poster-pixels" 
            className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Palette className="w-4 h-4" />
            <span>Poster Pixels</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="retitled" className="space-y-6 mt-0">
            <Card className="p-6">
              <RetitledEditor />
            </Card>
          </TabsContent>

          <TabsContent value="budget-bracket" className="space-y-6 mt-0">
            <Card className="p-6">
              <BudgetBracketEditor />
            </Card>
          </TabsContent>

          <TabsContent value="cast-climb" className="space-y-6 mt-0">
            <Card className="p-6">
              <CastClimbEditor />
            </Card>
          </TabsContent>

          <TabsContent value="poster-pixels" className="space-y-6 mt-0">
            <Card className="p-6">
              <PosterPixelsEditor />
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}