import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BudgetBracketGame from "@/components/game/budget-bracket/budget-bracket-game"

export const metadata = {
  title: "Budget Bracket - CinaMini",
  description: "Daily movie budget guessing game. Compare two movies and pick the one with the higher production budget!",
}

export default async function BudgetBracketPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get the user from the server (optional - no longer required)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <BudgetBracketGame />
}