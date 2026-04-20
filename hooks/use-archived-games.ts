"use client"

import { useEffect, useState } from "react"

export type GameMetadata = {
  game_id: string
  archived_date: string | null
  isArchived: boolean
}

/**
 * Fetches game metadata from `/api/games` and returns a Set of game IDs that
 * are currently archived (i.e. `archived_date` is set and <= today UTC).
 *
 * Games may exist in two formats throughout the admin UI:
 * - Hyphen form (e.g. `budget-bracket`) — matches `cinamini_games.game_id`
 * - Underscore form (e.g. `budget_bracket`) — matches database `game_type`
 *
 * The returned Set stores both forms so callers can use whichever they have.
 */
export function useArchivedGames() {
  const [archivedGameIds, setArchivedGameIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchGames = async () => {
      try {
        const response = await fetch("/api/games")
        if (!response.ok) {
          if (!cancelled) setLoading(false)
          return
        }
        const data = await response.json()
        const games: GameMetadata[] = data.games || []
        const archived = new Set<string>()
        games.forEach((game) => {
          if (game.isArchived) {
            archived.add(game.game_id)
            archived.add(game.game_id.replace(/-/g, "_"))
          }
        })
        if (!cancelled) {
          setArchivedGameIds(archived)
          setLoading(false)
        }
      } catch (error) {
        console.error("Failed to fetch archived game metadata:", error)
        if (!cancelled) setLoading(false)
      }
    }

    fetchGames()
    return () => {
      cancelled = true
    }
  }, [])

  return { archivedGameIds, loading }
}
