import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CastClimb from "@/components/game/cast-climb/cast-climb"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["cast-climb"].title,
  description: gameMetadata["cast-climb"].description,
  image: gameMetadata["cast-climb"].ogImage,
})

export default async function CastClimbPage() {
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

  return <CastClimb />
}
