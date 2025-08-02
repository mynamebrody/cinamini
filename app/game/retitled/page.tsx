import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RetitleGame from "@/components/game/retitled/retitle-game"

export const metadata = {
  title: "Retitled - CinaMini",
  description: "Can you guess today's movie from international titles? Test your cinema knowledge across languages and cultures!",
}

export default async function RetitledPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get the user from the server (optional - no longer required)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <RetitleGame />
}