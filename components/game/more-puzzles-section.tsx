"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { localGameStorage } from "@/lib/local-game-storage"
import { useGameMode } from "@/hooks/use-game-mode"
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
}

export function MorePuzzlesSection({ currentGameId }: MorePuzzlesSectionProps) {
  const { isAnonymous } = useGameMode()
  const [gameStatuses, setGameStatuses] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkGameStatuses = async () => {
      const statuses: Record<string, boolean> = {}
      
      for (const game of ALL_GAMES) {
        if (game.id !== currentGameId) {
          if (isAnonymous) {
            statuses[game.id] = localGameStorage.hasPlayedToday(game.id)
          } else {
            // For authenticated users, fetch from server
            try {
              const response = await fetch('/api/games')
              if (response.ok) {
                const data = await response.json()
                // The API returns { games: [...] }, so we need to extract the games array
                const games = Array.isArray(data?.games) ? data.games : []
                const gameStatus = games.find((g: any) => g.game_id === game.id)
                statuses[game.id] = gameStatus?.hasPlayedToday || false
              } else {
                statuses[game.id] = false
              }
            } catch (error) {
              console.error(`Error checking ${game.id} status:`, error)
              statuses[game.id] = false
            }
          }
        }
      }
      
      setGameStatuses(statuses)
    }
    
    checkGameStatuses()
  }, [currentGameId, isAnonymous])

  const otherGames = ALL_GAMES.filter(game => game.id !== currentGameId)

  return (
    <div className="w-full mt-6">
      <Card className="bg-white border border-[rgb(var(--silver))] shadow-3d-grey" style={{ borderRadius: 0 }}>
        <CardHeader className="text-center">
          <CardTitle className="text-lg font-bold text-gray-800">
            More Puzzles
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}