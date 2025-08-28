import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { constructMetadata, gameMetadata } from "@/lib/metadata"
import { getGameLaunchDate } from "@/lib/puzzle-numbering"
import BudgetBracketArchive from "@/components/game/budget-bracket/budget-bracket-archive"

export const metadata = constructMetadata({
  title: `${gameMetadata["budget-bracket"].title} Archive`,
  description: `Browse and play past ${gameMetadata["budget-bracket"].title} puzzles`,
  image: gameMetadata["budget-bracket"].ogImage,
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