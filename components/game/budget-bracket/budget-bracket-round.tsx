"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPosterUrl } from "@/lib/budget-bracket"
import { type GameChoice } from "@/lib/budget-bracket"
import { Clock, DollarSign } from "lucide-react"

interface PuzzleMovie {
  tmdb_id: number
  title: string
  poster_path: string | null
  release_date: string
}

interface PuzzlePair {
  round: number
  movieA: PuzzleMovie
  movieB: PuzzleMovie
}

interface PuzzleData {
  id: number
  puzzle_date: string
  seed_value: string
  pairs: PuzzlePair[]
  has_played: boolean
}

interface BudgetBracketRoundProps {
  pair: PuzzlePair
  round: number
  onChoice: (chosenMovieTmdbId: number, timeTaken: number) => void
  onGameEnd: (choices: GameChoice[]) => void
  gameChoices: GameChoice[]
  puzzle: PuzzleData
}

interface RevealedBudget {
  title: string
  budget: number
  budget_source: string
  is_estimated: boolean
}

export default function BudgetBracketRound({ 
  pair, 
  round, 
  onChoice, 
  onGameEnd, 
  gameChoices, 
  puzzle 
}: BudgetBracketRoundProps) {
  const [hasChosen, setHasChosen] = useState(false)
  const [chosenMovie, setChosenMovie] = useState<'A' | 'B' | null>(null)
  const [roundStartTime, setRoundStartTime] = useState<number>(0)

  useEffect(() => {
    setRoundStartTime(Date.now())
  }, [round])

  const handleMovieChoice = (movie: 'A' | 'B') => {
    if (hasChosen) return

    const chosenTmdbId = movie === 'A' ? pair.movieA.tmdb_id : pair.movieB.tmdb_id
    const timeTaken = Date.now() - roundStartTime

    setHasChosen(true)
    setChosenMovie(movie)

    // Immediately call the parent with the choice
    // The game logic will be handled by the main component
    onChoice(chosenTmdbId, timeTaken)
  }

  const formatBudget = (budget: number, isEstimated: boolean) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget)
    
    return isEstimated ? `${formatted} est.` : formatted
  }

  const getMovieYear = (releaseDate: string) => {
    return new Date(releaseDate).getFullYear()
  }

  return (
    <div className="space-y-6">
      {/* Round indicator */}
      <div className="text-center">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Round {round} of 5
        </Badge>
        {!hasChosen && (
          <p className="text-sm text-muted-foreground mt-2">
            Which movie had a higher production budget?
          </p>
        )}
      </div>

      {/* Movie comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Movie A */}
        <Card 
          className={`cursor-pointer transition-all duration-300 ${
            hasChosen 
              ? chosenMovie === 'A' 
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                : 'opacity-60'
              : 'hover:scale-105 hover:shadow-lg'
          }`}
          onClick={() => handleMovieChoice('A')}
        >
          <CardContent className="p-4">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden mb-3">
              <img
                src={getPosterUrl(pair.movieA.poster_path, 'w342')}
                alt={`${pair.movieA.title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-sm leading-tight mb-1">
                {pair.movieA.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {getMovieYear(pair.movieA.release_date)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Movie B */}
        <Card 
          className={`cursor-pointer transition-all duration-300 ${
            hasChosen 
              ? chosenMovie === 'B' 
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                : 'opacity-60'
              : 'hover:scale-105 hover:shadow-lg'
          }`}
          onClick={() => handleMovieChoice('B')}
        >
          <CardContent className="p-4">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden mb-3">
              <img
                src={getPosterUrl(pair.movieB.poster_path, 'w342')}
                alt={`${pair.movieB.title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-sm leading-tight mb-1">
                {pair.movieB.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {getMovieYear(pair.movieB.release_date)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VS indicator */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full font-bold">
          VS
        </div>
      </div>

      {/* Choice feedback */}
      {hasChosen && (
        <div className="text-center">
          <div className="text-muted-foreground">
            Choice submitted! Moving to next round...
          </div>
        </div>
      )}

              {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((roundNum) => (
            <div
              key={roundNum}
              className={`w-3 h-3 rounded-full ${
                roundNum < round
                  ? 'bg-green-500'
                  : roundNum === round
                    ? hasChosen
                      ? 'bg-blue-500'
                      : 'bg-primary'
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>
    </div>
  )
}