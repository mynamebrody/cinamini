import { isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CastClimbGame from "@/components/game/cast-climb/cast-climb-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["cast-climb"].title,
  description: gameMetadata["cast-climb"].description,
  image: gameMetadata["cast-climb"].ogImage,
})

interface CastClimbDatePageProps {
  params: Promise<{
    date: string
  }>
}

export default async function CastClimbDatePage({ params }: CastClimbDatePageProps) {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  const { date } = await params

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    redirect("/game/cast-climb")
  }

  // Parse and validate date
  const puzzleDate = new Date(date + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // If date is invalid or in the future, redirect to today's puzzle
  if (isNaN(puzzleDate.getTime()) || puzzleDate > today) {
    redirect("/game/cast-climb")
  }

  // Check if date is before game launch (assuming launch date is 2024-01-01)
  const launchDate = new Date('2024-01-01T00:00:00Z')
  if (puzzleDate < launchDate) {
    redirect("/game/cast-climb")
  }

  return <CastClimbGame date={date} />
}