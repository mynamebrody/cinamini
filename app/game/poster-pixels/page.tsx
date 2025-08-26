import { isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PosterPixelsGame from "@/components/game/poster-pixels/poster-pixels-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["poster-pixels"].title,
  description: gameMetadata["poster-pixels"].description,
  image: gameMetadata["poster-pixels"].ogImage,
})

export default async function PosterPixelsPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  return <PosterPixelsGame />
}