"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGameMode } from "@/hooks/use-game-mode"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { GameLogo } from "../game-logo"

interface GameInfo {
  id: string
  name: string
  emoji?: string
  logo?: string
  logoPng?: string
  path: string
}

const ALL_GAMES: GameInfo[] = [
  { id: "cast-climb", name: "Cast Climb", logo: "/cinamini/games/CastClimbPoster.svg", logoPng: "/cinamini/games/CastClimbPoster.png", emoji: "🎭", path: "/game/cast-climb" },
  { id: "retitled", name: "Retitled", logo: "/cinamini/games/RetitledPoster.svg", logoPng: "/cinamini/games/RetitledPoster.png", emoji: "🌍", path: "/game/retitled" },
  { id: "budget-bracket", name: "Budget Bracket", logo: "/cinamini/games/BudgetBracketPoster.svg", logoPng: "/cinamini/games/BudgetBracketPoster.png", emoji: "💰", path: "/game/budget-bracket" },
  { id: "poster-pixels", name: "Poster Pixels", logo: "/cinamini/games/PosterPixelsPoster.svg", logoPng: "/cinamini/games/PosterPixelsPoster.png", emoji: "🖼️", path: "/game/poster-pixels" }
]

interface MorePuzzlesSectionProps {
  currentGameId: string
  title?: string
  showArchiveRow?: boolean
  className?: string
}

export function MorePuzzlesSection({
  currentGameId,
  title = "More Puzzles",
  showArchiveRow = true,
  className,
}: MorePuzzlesSectionProps) {
  const { isAnonymous } = useGameMode()
  const [gameStatuses, setGameStatuses] = useState<Record<string, boolean>>({})
  const [activeGameIds, setActiveGameIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    const checkGameStatuses = async () => {
      const statuses: Record<string, boolean> = {}

      // Fetch from server (works for both anonymous and authenticated users)
      try {
        const response = await fetch('/api/games')
        if (response.ok) {
          const data = await response.json()
          // The API returns { games: [...] }, so we need to extract the games array
          const games = Array.isArray(data?.games) ? data.games : []

          // Determine which games are active based on archived_date (UTC midnight boundary)
          const todayUTC = new Date()
          todayUTC.setUTCHours(0, 0, 0, 0)
          const activeIds = new Set<string>()

          for (const g of games) {
            const archivedDate = g?.archived_date
            if (!archivedDate) {
              activeIds.add(g.game_id)
              continue
            }

            const archivedDateObj = new Date(`${archivedDate}T00:00:00Z`)
            if (Number.isNaN(archivedDateObj.getTime()) || archivedDateObj.getTime() > todayUTC.getTime()) {
              activeIds.add(g.game_id)
            }
          }
          setActiveGameIds(activeIds)

          for (const game of ALL_GAMES) {
            if (game.id !== currentGameId) {
              const gameStatus = games.find((g: any) => g.game_id === game.id)
              statuses[game.id] = gameStatus?.hasPlayedToday || false
            }
          }
        }
      } catch (error) {
        console.error('Error checking game statuses:', error)
        setActiveGameIds(null)
        // Fallback: mark all as not played
        for (const game of ALL_GAMES) {
          if (game.id !== currentGameId) {
            statuses[game.id] = false
          }
        }
      }

      setGameStatuses(statuses)
    }

    checkGameStatuses()
  }, [currentGameId, isAnonymous])

  const otherGames = ALL_GAMES.filter((game) => {
    if (game.id === currentGameId) return false
    // If we haven't loaded active games from the DB yet, don't hide anything.
    if (!activeGameIds) return true
    return activeGameIds.has(game.id)
  })
  const currentGame = ALL_GAMES.find(game => game.id === currentGameId)

  return (
    <div className={cn("w-full mt-6", className)}>
      <Card className="bg-white border border-[rgb(var(--silver))] shadow-3d-grey" style={{ borderRadius: 0 }}>
        <CardHeader className="text-center">
          <CardTitle className="text-lg font-bold text-gray-800">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {otherGames.map((game) => {
              const hasPlayed = gameStatuses[game.id]

              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-white border border-[rgb(var(--silver))] shadow-3d-grey"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <GameLogo
                        logo={game.logo}
                        logoPng={game.logoPng}
                        emoji={game.emoji}
                        alt={game.name}
                        width={32}
                        height={32}
                        className="w-8 h-8"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{game.name}</h3>
                      <div className="text-xs text-gray-600">
                        {hasPlayed ? "Completed today" : "Not played today"}
                      </div>
                    </div>
                  </div>

                  <Link href={game.path}>
                    <Button
                      size="sm"
                      variant={hasPlayed ? "outline" : "default"}
                      className={
                        hasPlayed
                          ? "border border-[rgb(var(--silver))] hover:border-[rgb(153,37,29)] hover:text-[rgb(153,37,29)] active:border-[rgb(153,37,29)] active:text-[rgb(153,37,29)] transition-all duration-150"
                          : "bg-[rgb(153,37,29)] hover:bg-white hover:text-[rgb(153,37,29)] text-white border border-[rgb(153,37,29)]"
                      }
                    >
                      {hasPlayed ? "Results" : "Play"}
                    </Button>
                  </Link>
                </div>
              )
            })}

            {/* Archive entry for current game */}
            {showArchiveRow && currentGame && (
              <div
                className="flex items-center justify-between p-3 bg-white border border-[rgb(var(--silver))] shadow-3d-grey"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <GameLogo
                      logo={currentGame.logo}
                      logoPng={currentGame.logoPng}
                      emoji={currentGame.emoji}
                      alt={`${currentGame.name} Archive`}
                      width={32}
                      height={32}
                      className="w-8 h-8"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{currentGame.name} Archive</h3>
                    <div className="text-xs text-gray-600">
                      Play previous games from the archive
                    </div>
                  </div>
                </div>

                <Link href={`/game/${currentGame.id}/archive`}>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-[rgb(153,37,29)] hover:bg-white hover:text-[rgb(153,37,29)] text-white border border-[rgb(153,37,29)]"
                  >
                    Play
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}