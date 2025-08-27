import { isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BudgetBracketGame from "@/components/game/budget-bracket/budget-bracket-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["budget-bracket"].title,
  description: gameMetadata["budget-bracket"].description,
  image: gameMetadata["budget-bracket"].ogImage,
})

interface BudgetBracketDatePageProps {
  params: Promise<{
    date: string
  }>
}

export default async function BudgetBracketDatePage({ params }: BudgetBracketDatePageProps) {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  const { date } = await params

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    redirect("/game/budget-bracket")
  }

  // Parse and validate date
  const puzzleDate = new Date(date + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // If date is invalid or in the future, redirect to today's puzzle
  if (isNaN(puzzleDate.getTime()) || puzzleDate > today) {
    redirect("/game/budget-bracket")
  }

  // Check if date is before game launch (assuming launch date is 2024-01-01)
  const launchDate = new Date('2024-01-01T00:00:00Z')
  if (puzzleDate < launchDate) {
    redirect("/game/budget-bracket")
  }

  return <BudgetBracketGame date={date} />
}