import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { constructMetadata, gameMetadata } from "@/lib/metadata"
import { getGameLaunchDate } from "@/lib/puzzle-numbering"
import RetitledArchive from "@/components/game/retitle/retitled-archive"

export const metadata = constructMetadata({
  title: `${gameMetadata.retitled.title} Archive`,
  description: `Browse and play past ${gameMetadata.retitled.title} puzzles`,
  image: gameMetadata.retitled.ogImage,
})

export default async function RetitledArchivePage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get launch date for the game
  const supabase = await createServiceClient()
  const launchDate = await getGameLaunchDate(supabase, 'retitled')

  return <RetitledArchive launchDate={launchDate} />
}