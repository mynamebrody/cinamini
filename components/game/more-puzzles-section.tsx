"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { localGameStorage } from "@/lib/local-game-storage"
import { useGameMode } from "@/hooks/use-game-mode"
import Link from "next/link"

interface GameInfo {
  id: string
  name: string
  emoji: string
  path: string
}

const ALL_GAMES: GameInfo[] = [
  { id: "cast-climb", name: "Cast Climb", emoji: "🎭", path: "/game/cast-climb" },
  { id: "retitled", name: "Retitled", emoji: "🌍", path: "/game/retitled" },
  { id: "budget-bracket", name: "Budget Bracket", emoji: "💰", path: "/game/budget-bracket" },
  { id: "poster-pixels", name: "Poster Pixels", emoji: "🖼️", path: "/game/poster-pixels" }
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
    <div className="w-full">
      <Card className="bg-white border-gray-300 shadow-[1px_1px_0px_rgb(156,163,175),2px_2px_0px_rgb(156,163,175),3px_3px_0px_rgb(156,163,175),4px_4px_0px_rgb(156,163,175)]" style={{ borderRadius: 0 }}>
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
                  className="flex items-center justify-between p-3 bg-white border border-gray-300 shadow-[1px_1px_0px_rgb(156,163,175),2px_2px_0px_rgb(156,163,175),3px_3px_0px_rgb(156,163,175),4px_4px_0px_rgb(156,163,175)]"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{game.emoji}</div>
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
                          ? "border-gray-300 hover:border-[rgb(153,37,29)] hover:text-[rgb(153,37,29)]"
                          : "bg-[rgb(153,37,29)] hover:bg-[rgb(122,29,22)] text-white"
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