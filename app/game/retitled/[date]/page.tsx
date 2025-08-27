import { isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RetitleGame from "@/components/game/retitle/retitle-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata.retitled.title,
  description: gameMetadata.retitled.description,
  image: gameMetadata.retitled.ogImage,
})

interface RetitledDatePageProps {
  params: Promise<{
    date: string
  }>
}

export default async function RetitledDatePage({ params }: RetitledDatePageProps) {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  const { date } = await params

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    redirect("/game/retitled")
  }

  // Parse and validate date
  const puzzleDate = new Date(date + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // If date is invalid or in the future, redirect to today's puzzle
  if (isNaN(puzzleDate.getTime()) || puzzleDate > today) {
    redirect("/game/retitled")
  }

  // Check if date is before game launch (assuming launch date is 2024-01-01)
  const launchDate = new Date('2024-01-01T00:00:00Z')
  if (puzzleDate < launchDate) {
    redirect("/game/retitled")
  }

  return <RetitleGame date={date} />
}