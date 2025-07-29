import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PosterPixelGame from "@/components/game/poster-pixel/poster-pixel-game"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Poster Pixel | CinaMini",
  description: "Guess the movie from its pixelated poster. Each wrong guess reveals more detail!",
}

export default async function PosterPixelPage() {
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

  return <PosterPixelGame />
}