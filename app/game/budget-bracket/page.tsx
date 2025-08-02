import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BudgetBracketGame from "@/components/game/budget-bracket/budget-bracket-game"
import { constructMetadata, gameMetadata } from "@/lib/metadata"

export const metadata = constructMetadata({
  title: gameMetadata["budget-bracket"].title,
  description: gameMetadata["budget-bracket"].description,
  image: gameMetadata["budget-bracket"].ogImage,
})

export default async function BudgetBracketPage() {
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

  return <BudgetBracketGame />
}