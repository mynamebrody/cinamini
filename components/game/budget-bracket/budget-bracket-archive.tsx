import { GameArchive } from "@/components/game/game-calendar"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

interface BudgetBracketArchiveProps {
  launchDate: Date
  user: any
  displayName: string | null
}

export default function BudgetBracketArchive({ launchDate, user, displayName }: BudgetBracketArchiveProps) {
  return (
    <>
      <SiteHeader user={user} displayName={displayName} />
      <GameArchive
        gameSlug="budget-bracket"
        gameTitle="Budget Bracket"
        launchDate={launchDate}
      />
      <SiteFooter />
    </>
  )
}