import { GameArchive } from "@/components/game/game-calendar"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

interface PosterPixelsArchiveProps {
  launchDate: Date
  user: any
  displayName: string | null
}

export default function PosterPixelsArchive({ launchDate, user, displayName }: PosterPixelsArchiveProps) {
  return (
    <>
      <SiteHeader user={user} displayName={displayName} />
      <GameArchive
        gameSlug="poster-pixels"
        gameTitle="Poster Pixels"
        launchDate={launchDate}
      />
      <SiteFooter />
    </>
  )
}