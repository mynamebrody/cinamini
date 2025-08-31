import { createClient, isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
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

  // Get user data
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user profile for display name/username if logged in
  let displayName = null
  if (user) {
    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    displayName = profile?.display_name || user.email
  }

  // Get launch date for the game
  const serviceSupabase = await createServiceClient()
  const launchDate = await getGameLaunchDate(serviceSupabase, 'poster-pixels')

  return <PosterPixelsArchive launchDate={launchDate} user={user} displayName={displayName} />
}