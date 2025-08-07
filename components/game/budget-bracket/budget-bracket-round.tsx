"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPosterUrl, type GameChoice } from "@/lib/budget-bracket-client"
import { Clock, DollarSign, TrendingUp, TrendingDown } from "lucide-react"

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
  gameStartTime: number
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
  puzzle,
  gameStartTime 
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
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showingFeedback, setShowingFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [budgetA, setBudgetA] = useState<number | null>(null)
  const [budgetB, setBudgetB] = useState<number | null>(null)
  const [releaseDateA, setReleaseDateA] = useState<string | null>(null)
  const [releaseDateB, setReleaseDateB] = useState<string | null>(null)

  useEffect(() => {
    // Reset state for new round
    setHasChosen(false)
    setChosenMovie(null)
    setShowingFeedback(false)
    setIsCorrect(null)
    setBudgetA(null)
    setBudgetB(null)
    setReleaseDateA(null)
    setReleaseDateB(null)
  }, [round])

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameStartTime > 0) {
        setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStartTime])

  const handleMovieChoice = async (movie: 'A' | 'B') => {
    if (hasChosen) return

    const chosenTmdbId = movie === 'A' ? pair.movieA.tmdb_id : pair.movieB.tmdb_id
    const timeTaken = Date.now() - gameStartTime

    setHasChosen(true)
    setChosenMovie(movie)
    
    // Add haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

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
        
        // Celebration vibration for correct answers
        if (correct && navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 200])
        } else if (!correct && navigator.vibrate) {
          navigator.vibrate([200])
        }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Round indicator with progress dots */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
        >
          <Badge variant="secondary" className="text-lg px-4 py-2 bg-transparent border-2 border border-[rgb(var(--silver))]">
            🎬 Round {round} of 5 🏢
          </Badge>
        </motion.div>
        
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((roundNum) => {
            // Find if this round has been completed
            const completedChoice = gameChoices.find(choice => choice.round === roundNum)
            
            let emoji = '⬜'
            if (roundNum < round) {
              // Past rounds
              emoji = completedChoice?.correct ? '🟩' : '🟥'
            } else if (roundNum === round && hasChosen && showingFeedback && isCorrect !== null) {
              // Current round with feedback
              emoji = isCorrect ? '🟩' : '🟥'
            }
            
            return (
              <span
                key={roundNum}
                className="text-lg"
              >
                {emoji}
              </span>
            )
          })}
        </div>
        
        {!hasChosen && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground flex items-center justify-center space-x-1"
          >
            <span>💰</span>
            <span>Which movie had a higher production budget?</span>
            <span>🎥</span>
          </motion.p>
        )}
      </div>

      {/* Movie comparison */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 items-stretch">
        {/* Movie A */}
        <motion.div
          whileHover={!hasChosen ? { scale: 1.02, y: -2 } : {}}
          whileTap={!hasChosen ? { scale: 0.98 } : {}}
          animate={{
            scale: hasChosen && chosenMovie === 'A' && showingFeedback && isCorrect ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.3 }}
          className={`${
            hasChosen 
              ? chosenMovie === 'A' 
                ? showingFeedback && isCorrect !== null
                  ? isCorrect 
                    ? 'shadow-3d-green' 
                    : 'shadow-3d-red'
                  : 'shadow-3d-grey'
                : showingFeedback && budgetA && budgetB && budgetA > budgetB && chosenMovie === 'B'
                  ? 'shadow-3d-green'
                  : showingFeedback && budgetA && budgetB && budgetA < budgetB && chosenMovie === 'B'
                    ? 'shadow-3d-red'
                    : ''
              : 'hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
          }`}
        >
          <Card 
            className={`cursor-pointer transition-all duration-300 h-full flex flex-col ${
              hasChosen 
                ? chosenMovie === 'A' 
                  ? showingFeedback && isCorrect !== null
                    ? isCorrect 
                      ? 'border-2 border-green-500 bg-green-50' 
                      : 'border-2 border-red-500 bg-red-50'
                    : 'border-2 border-blue-500 bg-blue-50'
                  : showingFeedback && budgetA && budgetB && budgetA > budgetB && chosenMovie === 'B'
                    ? 'border-2 border-green-500 bg-green-50'
                    : 'opacity-60 grayscale'
                : 'border-2 border border-[rgb(var(--silver))] hover:border-[rgb(153,37,29)]'
            }`}
            onClick={() => handleMovieChoice('A')}
          >
          <CardContent className="p-4 md:p-8 flex flex-col h-full">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden mt-4 mb-4 max-w-[200px] mx-auto flex-shrink-0">
              <img
                src={getPosterUrl(pair.movieA.poster_path, 'w342')}
                alt={`${pair.movieA.title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="text-center flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm leading-tight mb-1">
                  {pair.movieA.title}
                </h3>
                <p className="text-xs text-muted-foreground font-bold">
                  {getMovieYear(releaseDateA || pair.movieA.release_date) || 'Missing Date'}
                </p>
              </div>
              
              {/* Budget reveal */}
              {showingFeedback && budgetA && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={`mt-3 p-1.5 rounded ${
                    budgetB && budgetA > budgetB 
                      ? 'bg-gradient-to-r from-green-100 to-green-50 border border-green-500 shadow-3d-green' 
                      : 'bg-gradient-to-r from-red-100 to-red-50 border border-red-400 shadow-3d-red'
                  }`}
                >
                  <div className={`flex items-center justify-center gap-1 text-xs font-mono font-bold ${
                    budgetB && budgetA > budgetB ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {formatBudget(budgetA, false)}
                    {budgetB && budgetA > budgetB && (
                      <TrendingUp className="w-3 h-3 text-green-600 ml-1" />
                    )}
                    {budgetB && budgetA < budgetB && (
                      <TrendingDown className="w-3 h-3 text-red-600 ml-1" />
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </CardContent>
          </Card>
        </motion.div>

        {/* Movie B */}
        <motion.div
          whileHover={!hasChosen ? { scale: 1.02, y: -2 } : {}}
          whileTap={!hasChosen ? { scale: 0.98 } : {}}
          animate={{
            scale: hasChosen && chosenMovie === 'B' && showingFeedback && isCorrect ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.3 }}
          className={`${
            hasChosen 
              ? chosenMovie === 'B' 
                ? showingFeedback && isCorrect !== null
                  ? isCorrect 
                    ? 'shadow-3d-green' 
                    : 'shadow-3d-red'
                  : 'shadow-3d-grey'
                : showingFeedback && budgetA && budgetB && budgetB > budgetA && chosenMovie === 'A'
                  ? 'shadow-3d-green'
                  : showingFeedback && budgetA && budgetB && budgetB < budgetA && chosenMovie === 'A'
                    ? 'shadow-3d-red'
                    : ''
              : 'hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
          }`}
        >
          <Card 
            className={`cursor-pointer transition-all duration-300 h-full flex flex-col ${
              hasChosen 
                ? chosenMovie === 'B' 
                  ? showingFeedback && isCorrect !== null
                    ? isCorrect 
                      ? 'border-2 border-green-500 bg-green-50' 
                      : 'border-2 border-red-500 bg-red-50'
                    : 'border-2 border-blue-500 bg-blue-50'
                  : showingFeedback && budgetA && budgetB && budgetB > budgetA && chosenMovie === 'A'
                    ? 'border-2 border-green-500 bg-green-50'
                    : 'opacity-60 grayscale'
                : 'border-2 border border-[rgb(var(--silver))] hover:border-[rgb(153,37,29)]'
            }`}
            onClick={() => handleMovieChoice('B')}
          >
          <CardContent className="p-4 md:p-8 flex flex-col h-full">
            <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden mt-4 mb-4 max-w-[200px] mx-auto flex-shrink-0">
              <img
                src={getPosterUrl(pair.movieB.poster_path, 'w342')}
                alt={`${pair.movieB.title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="text-center flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm leading-tight mb-1">
                  {pair.movieB.title}
                </h3>
                <p className="text-xs text-muted-foreground font-bold">
                  {getMovieYear(releaseDateB || pair.movieB.release_date) || 'Missing Date'}
                </p>
              </div>
              
              {/* Budget reveal */}
              {showingFeedback && budgetB && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={`mt-3 p-1.5 rounded ${
                    budgetA && budgetB > budgetA 
                      ? 'bg-gradient-to-r from-green-100 to-green-50 border border-green-500 shadow-3d-green' 
                      : 'bg-gradient-to-r from-red-100 to-red-50 border border-red-400 shadow-3d-red'
                  }`}
                >
                  <div className={`flex items-center justify-center gap-1 text-xs font-mono font-bold ${
                    budgetA && budgetB > budgetA ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {formatBudget(budgetB, false)}
                    {budgetA && budgetB > budgetA && (
                      <TrendingUp className="w-3 h-3 text-green-600 ml-1" />
                    )}
                    {budgetA && budgetB < budgetA && (
                      <TrendingDown className="w-3 h-3 text-red-600 ml-1" />
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Studio Timer */}
      <div className="text-center text-muted-foreground">
        <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
          <span className="text-xs">🎬</span>
          <p className="text-sm font-mono">Studio Time: {formatTime(elapsedTime)}</p>
        </div>
      </div>

      {/* Choice feedback */}
      {hasChosen && !showingFeedback && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-muted-foreground animate-pulse flex items-center justify-center space-x-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              💰
            </motion.div>
            <span>Revealing budgets...</span>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              🎬
            </motion.div>
          </div>
        </motion.div>
      )}

      {showingFeedback && isCorrect !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-2"
        >
          {isCorrect ? (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.4 }}
              className="text-green-600 font-semibold bg-green-50 p-3 border border-green-500 shadow-3d-green"
            >
              <div className="flex items-center justify-center space-x-2">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  🟩
                </motion.span>
                <span>Correct! {pair[chosenMovie === 'A' ? 'movieA' : 'movieB'].title} had the higher budget!</span>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  💰
                </motion.span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.4 }}
              className="text-red-800 font-semibold bg-red-50 p-3 border border-red-400 shadow-3d-red rounded"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-sm flex items-center">🟥</span>
                <span>Wrong! {budgetA && budgetB && budgetA > budgetB ? pair.movieA.title : pair.movieB.title} had the higher budget.</span>
              </div>
            </motion.div>
          )}
          
          {budgetA && budgetB && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground bg-gray-50 p-2 border border border-[rgb(var(--silver))]"
            >
              <strong>Budget Difference:</strong> {Math.abs(budgetA - budgetB).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm text-muted-foreground font-medium"
          >
            {isCorrect && round < 5 ? (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <span>🎬</span>
                <span>Climbing to the next floor...</span>
                <span>🏢</span>
              </div>
            ) : isCorrect && round === 5 ? (
              <div className="flex items-center justify-center space-x-2 text-yellow-600">
                <span>👑</span>
                <span>Hollywood Mogul Achieved!</span>
                <span>🏆</span>
              </div>
             ) : round < 5 ? (
              <div className="flex items-center justify-center space-x-2 text-orange-600">
                <span>📈</span>
                <span>Still climbing... next floor awaits!</span>
                <span>💪</span>
              </div>
             ) : (
              <div className="flex items-center justify-center space-x-2 text-purple-600">
                <span>🎭</span>
                <span>Your Hollywood journey is complete!</span>
                <span>🌟</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}