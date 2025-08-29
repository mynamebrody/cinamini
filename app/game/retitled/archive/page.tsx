import { createClient, isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server"
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
  const launchDate = await getGameLaunchDate(serviceSupabase, 'retitled')

  return <RetitledArchive launchDate={launchDate} user={user} displayName={displayName} />
}