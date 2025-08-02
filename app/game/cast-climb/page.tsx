import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CastClimbGame from "@/components/game/cast-climb/cast-climb-game"

export const metadata = {
  title: "Cast Climb - CinaMini",
  description: "Guess all the actors in today's movie! Start with the lead and work your way through the cast.",
}

export default async function CastClimbPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get the user from the server (optional - no longer required)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <CastClimbGame />
}
