import { GameArchive } from "@/components/game/game-calendar"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

interface CastClimbArchiveProps {
  launchDate: Date
  user: any
  displayName: string | null
}

export default function CastClimbArchive({ launchDate, user, displayName }: CastClimbArchiveProps) {
  return (
    <>
      <SiteHeader user={user} displayName={displayName} />
      <GameArchive
        gameSlug="cast-climb"
        gameTitle="Cast Climb"
        launchDate={launchDate}
      />
      <SiteFooter />
    </>
  )
}