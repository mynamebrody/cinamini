import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BudgetBracketGame from "@/components/game/budget-bracket/budget-bracket-game"
import BudgetBracketArchivedMessage from "@/components/game/budget-bracket/budget-bracket-archived-message"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["budget-bracket"].title,
  description: gameMetadata["budget-bracket"].description,
  image: gameMetadata["budget-bracket"].ogImage,
})

export default async function BudgetBracketPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Check if Budget Bracket is archived
  const supabaseService = createServiceClient()
  const { data: gameData } = await supabaseService
    .from('cinamini_games')
    .select('archived_date')
    .eq('game_id', 'budget-bracket')
    .single()

  if (gameData?.archived_date) {
    const todayUTC = new Date()
    todayUTC.setUTCHours(0, 0, 0, 0)
    const archivedDate = new Date(gameData.archived_date + 'T00:00:00Z')
    
    if (archivedDate.getTime() <= todayUTC.getTime()) {
      return <BudgetBracketArchivedMessage />
    }
  }

  return <BudgetBracketGame />
}