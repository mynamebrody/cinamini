"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPosterUrl, type GameChoice } from "@/lib/budget-bracket-client"
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
  const [showingFeedback, setShowingFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [budgetA, setBudgetA] = useState<number | null>(null)
  const [budgetB, setBudgetB] = useState<number | null>(null)

  useEffect(() => {
    // Reset state for new round
    setRoundStartTime(Date.now())
    setHasChosen(false)
    setChosenMovie(null)
    setShowingFeedback(false)
    setIsCorrect(null)
    setBudgetA(null)
    setBudgetB(null)
  }, [round])

  const handleMovieChoice = async (movie: 'A' | 'B') => {
    if (hasChosen) return

    const chosenTmdbId = movie === 'A' ? pair.movieA.tmdb_id : pair.movieB.tmdb_id
    const timeTaken = Date.now() - roundStartTime

    setHasChosen(true)
    setChosenMovie(movie)

    // Fetch budget information to show feedback
    try {
      // Get budget data from the API (we'll create a simple endpoint for this)
      const response = await fetch(`/api/budget-bracket/movie-budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieA_tmdb_id: pair.movieA.tmdb_id,
          movieB_tmdb_id: pair.movieB.tmdb_id
        })
      })

      if (response.ok) {
        const budgetData = await response.json()
        setBudgetA(budgetData.movieA.budget)
        setBudgetB(budgetData.movieB.budget)
        
        // Determine if choice was correct
        const movieABudget = budgetData.movieA.budget
        const movieBBudget = budgetData.movieB.budget
        const chosenBudget = movie === 'A' ? movieABudget : movieBBudget
        const otherBudget = movie === 'A' ? movieBBudget : movieABudget
        const correct = chosenBudget > otherBudget
        
        setIsCorrect(correct)
        setShowingFeedback(true)
      }
    } catch (error) {
      console.error('Error fetching budget data:', error)
    }

    // Call the parent with the choice (after showing feedback)
    setTimeout(() => {
      onChoice(chosenTmdbId, timeTaken)
    }, 500)
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
                ? showingFeedback && isCorrect !== null
                  ? isCorrect 
                    ? 'ring-2 ring-green-500 bg-green-50' 
                    : 'ring-2 ring-red-500 bg-red-50'
                  : 'ring-2 ring-blue-500 bg-blue-50'
                : showingFeedback && budgetA && budgetB && budgetA > budgetB && chosenMovie === 'B'
                  ? 'ring-2 ring-green-500 bg-green-50'
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
              
              {/* Budget reveal */}
              {showingFeedback && budgetA && (
                <div className="mt-3 p-2 bg-background rounded border">
                  <div className="flex items-center justify-center gap-1 text-sm font-mono">
                    <DollarSign className="w-3 h-3" />
                    {formatBudget(budgetA, false)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movie B */}
        <Card 
          className={`cursor-pointer transition-all duration-300 ${
            hasChosen 
              ? chosenMovie === 'B' 
                ? showingFeedback && isCorrect !== null
                  ? isCorrect 
                    ? 'ring-2 ring-green-500 bg-green-50' 
                    : 'ring-2 ring-red-500 bg-red-50'
                  : 'ring-2 ring-blue-500 bg-blue-50'
                : showingFeedback && budgetA && budgetB && budgetB > budgetA && chosenMovie === 'A'
                  ? 'ring-2 ring-green-500 bg-green-50'
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
              
              {/* Budget reveal */}
              {showingFeedback && budgetB && (
                <div className="mt-3 p-2 bg-background rounded border">
                  <div className="flex items-center justify-center gap-1 text-sm font-mono">
                    <DollarSign className="w-3 h-3" />
                    {formatBudget(budgetB, false)}
                  </div>
                </div>
              )}
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
      {hasChosen && !showingFeedback && (
        <div className="text-center">
          <div className="text-muted-foreground animate-pulse">
            Revealing budgets...
          </div>
        </div>
      )}

      {showingFeedback && isCorrect !== null && (
        <div className="text-center space-y-2">
          {isCorrect ? (
            <div className="text-green-600 font-semibold">
              ✅ Correct! {pair[chosenMovie === 'A' ? 'movieA' : 'movieB'].title} had the higher budget!
            </div>
          ) : (
            <div className="text-red-600 font-semibold">
              ❌ Wrong! {budgetA && budgetB && budgetA > budgetB ? pair.movieA.title : pair.movieB.title} had the higher budget.
            </div>
          )}
          
          {budgetA && budgetB && (
            <div className="text-sm text-muted-foreground">
              Difference: {Math.abs(budgetA - budgetB).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {isCorrect && round < 5 ? 'Moving to next round...' : isCorrect && round === 5 ? 'Perfect Producer!' : 'Game Over'}
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
                       ? showingFeedback && isCorrect !== null
                         ? isCorrect
                           ? 'bg-green-500'
                           : 'bg-red-500'
                         : 'bg-blue-500'
                       : 'bg-primary'
                     : 'bg-muted'
               }`}
             />
           ))}
         </div>
    </div>
  )
}