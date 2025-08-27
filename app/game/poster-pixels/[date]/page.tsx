import { isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PosterPixelsGame from "@/components/game/poster-pixels/poster-pixels-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["poster-pixels"].title,
  description: gameMetadata["poster-pixels"].description,
  image: gameMetadata["poster-pixels"].ogImage,
})

interface PosterPixelsDatePageProps {
  params: Promise<{
    date: string
  }>
}

export default async function PosterPixelsDatePage({ params }: PosterPixelsDatePageProps) {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  const { date } = await params

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    redirect("/game/poster-pixels")
  }

  // Parse and validate date
  const puzzleDate = new Date(date + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // If date is invalid or in the future, redirect to today's puzzle
  if (isNaN(puzzleDate.getTime()) || puzzleDate > today) {
    redirect("/game/poster-pixels")
  }

  // Check if date is before game launch (assuming launch date is 2024-01-01)
  const launchDate = new Date('2024-01-01T00:00:00Z')
  if (puzzleDate < launchDate) {
    redirect("/game/poster-pixels")
  }

  return <PosterPixelsGame date={date} />
}