import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CastClimbGame from "@/components/game/cast-climb/cast-climb-game"

export const metadata = {
  title: "Cast Climb - CinaMini",
  description: "Guess the movie by unveiling cast members. Each wrong guess reveals another actor!",
}

export default async function CastClimbPage() {
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <CastClimbGame />
}
