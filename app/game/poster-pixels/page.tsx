import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PosterPixelsGame from "@/components/game/poster-pixels/poster-pixels-game"

export const metadata = {
  title: "Poster Pixels - CinaMini",
  description: "Can you guess the movie from a pixelated poster? Test your visual movie knowledge!",
}

export default async function PosterPixelsPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get the user from the server (optional - no longer required)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <PosterPixelsGame />
}