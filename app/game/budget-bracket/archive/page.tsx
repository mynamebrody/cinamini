import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { constructMetadata, gameMetadata } from "@/lib/metadata"
import { getGameLaunchDate } from "@/lib/puzzle-numbering"
import BudgetBracketArchive from "@/components/game/budget-bracket/budget-bracket-archive"

export const metadata = constructMetadata({
  title: `${gameMetadata.budgetBracket.title} Archive`,
  description: `Browse and play past ${gameMetadata.budgetBracket.title} puzzles`,
  image: gameMetadata.budgetBracket.ogImage,
})

export default async function BudgetBracketArchivePage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get launch date for the game
  const supabase = await createServiceClient()
  const launchDate = await getGameLaunchDate(supabase, 'budget-bracket')

  return <BudgetBracketArchive launchDate={launchDate} />
}