import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PosterPixelsGame from "@/components/game/poster-pixels/poster-pixels-game"

export const metadata = {
  title: "Poster Pixels - CinaMini",
  description: "Daily movie poster guessing game. Guess the movie from its pixelated poster as it becomes clearer over 30 seconds!",
}

export default async function PosterPixelsPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get the user from the server
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  return <PosterPixelsGame />
}