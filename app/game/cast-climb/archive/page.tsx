import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { constructMetadata, gameMetadata } from "@/lib/metadata"
import { getGameLaunchDate } from "@/lib/puzzle-numbering"
import CastClimbArchive from "@/components/game/cast-climb/cast-climb-archive"

export const metadata = constructMetadata({
  title: `${gameMetadata.castClimb.title} Archive`,
  description: `Browse and play past ${gameMetadata.castClimb.title} puzzles`,
  image: gameMetadata.castClimb.ogImage,
})

export default async function CastClimbArchivePage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get launch date for the game
  const supabase = await createServiceClient()
  const launchDate = await getGameLaunchDate(supabase, 'cast-climb')

  return <CastClimbArchive launchDate={launchDate} />
}