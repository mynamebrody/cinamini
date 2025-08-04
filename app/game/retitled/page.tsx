import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RetitleGame from "@/components/game/retitle/retitle-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata.retitled.title,
  description: gameMetadata.retitled.description,
  image: gameMetadata.retitled.ogImage,
})

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