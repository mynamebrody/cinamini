import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { constructMetadata, gameMetadata } from "@/lib/metadata"
import { getGameLaunchDate } from "@/lib/puzzle-numbering"
import PosterPixelsArchive from "@/components/game/poster-pixels/poster-pixels-archive"

export const metadata = constructMetadata({
  title: `${gameMetadata["poster-pixels"].title} Archive`,
  description: `Browse and play past ${gameMetadata["poster-pixels"].title} puzzles`,
  image: gameMetadata["poster-pixels"].ogImage,
})

export default async function PosterPixelsArchivePage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get launch date for the game
  const supabase = await createServiceClient()
  const launchDate = await getGameLaunchDate(supabase, 'poster-pixels')

  return <PosterPixelsArchive launchDate={launchDate} />
}