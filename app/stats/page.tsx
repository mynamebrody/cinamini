import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import CastClimbStats from "@/components/game/cast-climb/cast-climb-stats"
import RetitleStats from "@/components/game/retitle/retitle-stats"
import BudgetBracketStats from "@/components/game/budget-bracket/budget-bracket-stats"
import PosterPixelsStats from "@/components/game/poster-pixels/poster-pixels-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function StatsPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <h1 className="text-2xl font-bold mb-4 text-neutral-900 font-funnel-display-bold">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to anonymous stats
  if (!user) {
    redirect("/stats/anonymous")
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <a href="/" className="text-neutral-900 hover:text-[rgb(153,37,29)] transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </a>
            </Button>
            <h1 className="text-xl font-bold text-neutral-900 font-funnel-display-bold">Your Statistics</h1>
            <div className="w-[120px]"></div> {/* Spacer to center the title */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
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
      </main>
    </div>
  )
}