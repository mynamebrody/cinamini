import { isSupabaseConfigured } from "@/lib/supabase/server"
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

  return <RetitleGame />
}