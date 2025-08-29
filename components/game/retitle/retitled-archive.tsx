import { GameArchive } from "@/components/game/game-calendar"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

interface RetitledArchiveProps {
  launchDate: Date
  user: any
  displayName: string | null
}

export default function RetitledArchive({ launchDate, user, displayName }: RetitledArchiveProps) {
  return (
    <>
      <SiteHeader user={user} displayName={displayName} />
      <GameArchive
        gameSlug="retitled"
        gameTitle="Retitled"
        launchDate={launchDate}
      />
      <SiteFooter />
    </>
  )
}