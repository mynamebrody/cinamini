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
  release_date: string | null | undefined
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
  gameChoices, 
  puzzle 
}: BudgetBracketRoundProps) {
  // Safety check for pair data
  if (!pair || !pair.movieA || !pair.movieB) {
    return (
      <div className="text-center text-red-500">
        Error: Missing pair data for round {round}
      </div>
    )
  }

  // Debug: Log the actual release_date values we receive
  console.log('Budget Bracket pair release dates:', {
    movieA: pair.movieA.release_date,
    movieB: pair.movieB.release_date,
    movieA_type: typeof pair.movieA.release_date,
    movieB_type: typeof pair.movieB.release_date
  })
  
  const [hasChosen, setHasChosen] = useState(false)
  const [chosenMovie, setChosenMovie] = useState<'A' | 'B' | null>(null)
  const [roundStartTime, setRoundStartTime] = useState<number>(0)
  const [showingFeedback, setShowingFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [budgetA, setBudgetA] = useState<number | null>(null)
  const [budgetB, setBudgetB] = useState<number | null>(null)
  const [releaseDateA, setReleaseDateA] = useState<string | null>(null)
  const [releaseDateB, setReleaseDateB] = useState<string | null>(null)

  useEffect(() => {
    // Reset state for new round
    setRoundStartTime(Date.now())
    setHasChosen(false)
    setChosenMovie(null)
    setShowingFeedback(false)
    setIsCorrect(null)
    setBudgetA(null)
    setBudgetB(null)
    setReleaseDateA(null)
    setReleaseDateB(null)
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
        
        // Set hydrated release dates
        setReleaseDateA(budgetData.movieA.release_date)
        setReleaseDateB(budgetData.movieB.release_date)
        
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

  const getMovieYear = (releaseDate: string | undefined | null) => {
    // Handle null, undefined, or empty string
    if (!releaseDate || (typeof releaseDate === 'string' && releaseDate.trim() === '')) {
      return 'Unknown'
    }
    
    // Convert to string if it's not already
    const dateStr = String(releaseDate)
    
    // Handle invalid date formats
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      
      // Check if date is valid and year is reasonable
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
        return 'Unknown'
      }
      
      return year
    } catch (error) {
      console.error('Error parsing release date:', { releaseDate, error })
      return 'Unknown'
    }
  }

  return (
    <div className="space-y-4">
      {/* Round indicator with progress dots */}
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Round {round} of 5
        </Badge>
        
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((roundNum) => {
            // Find if this round has been completed
            const completedChoice = gameChoices.find(choice => choice.round === roundNum)
            
            return (
              <div
                key={roundNum}
                className={`w-3 h-3 rounded-full ${
                  roundNum < round
                    ? completedChoice?.correct
                      ? 'bg-green-500'  // Correct answer
                      : 'bg-red-500'    // Wrong answer
                    : roundNum === round
                      ? hasChosen
                        ? showingFeedback && isCorrect !== null
                          ? isCorrect
                            ? 'bg-green-500'  // Current round - correct
                            : 'bg-red-500'    // Current round - wrong
                          : 'bg-blue-500'     // Current round - processing
                        : 'bg-primary'        // Current round - not chosen yet
                      : 'bg-muted'            // Future rounds
                }`}
              />
            )
          })}
        </div>
        
        {!hasChosen && (
          <p className="text-sm text-muted-foreground">
            Which movie had a higher production budget?
          </p>
        )}
      </div>

      {/* Movie comparison */}
      <div className="grid grid-cols-2 gap-6">
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
          <CardContent className="p-8">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden mt-4 mb-4 max-w-[200px] mx-auto">
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
              <p className="text-xs text-muted-foreground font-bold">
                {getMovieYear(releaseDateA || pair.movieA.release_date) || 'Missing Date'}
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
          <CardContent className="p-8">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden mt-4 mb-4 max-w-[200px] mx-auto">
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
              <p className="text-xs text-muted-foreground font-bold">
                {getMovieYear(releaseDateB || pair.movieB.release_date) || 'Missing Date'}
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
            {isCorrect && round < 5 ? 'Moving to next round...' : 
             isCorrect && round === 5 ? 'Perfect Producer!' : 
             round < 5 ? 'Moving to next round...' : 
             'Game Complete!'}
          </div>
        </div>
      )}
    </div>
  )
}