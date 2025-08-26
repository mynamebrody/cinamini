"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShareSection } from "@/components/game/share-section"
import Image from "next/image"
import { 
  Trophy, 
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Crown,
  Star
} from "lucide-react"
import { generateSharePattern, formatBudget, getPosterUrl, type GameChoice } from "@/lib/budget-bracket-client"
import { formatGameTime } from "@/lib/utils"
import { useBudgetBracketShare } from "@/hooks/useGameShare"

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
  puzzle_number: number
  name?: string
  seed_value: string
  pairs: PuzzlePair[]
  has_played: boolean
}

interface GameResult {
  game_id: number
  rounds_completed: number
  final_result: string
  is_perfect_game: boolean
  total_duration_ms: number
  revealed_pairs: Array<{
    round: number
    chosen_movie: number
    correct: boolean
    time_taken_ms: number
    revealed_budgets: {
      movieA: { tmdb_id: number; title: string; budget: number; budget_source: string; is_estimated: boolean }
      movieB: { tmdb_id: number; title: string; budget: number; budget_source: string; is_estimated: boolean }
    }
    correct_choice: 'A' | 'B'
    budget_difference: number
    difficulty_ratio: number
  }>
  updated_stats: any
}

interface BudgetBracketResultProps {
  result: GameResult
  puzzle: PuzzleData
}

export default function BudgetBracketResult({ result, puzzle }: BudgetBracketResultProps) {
  const [allRoundsData, setAllRoundsData] = useState<any[]>([])
  const [loadingAnswers, setLoadingAnswers] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  
  const correctAnswers = result.revealed_pairs?.filter(p => p.correct).length || 0
  
  const { shareText: centralizedShareText, fetchShare } = useBudgetBracketShare(puzzle.id.toString())
  
  // Generate share text on mount
  useEffect(() => {
    fetchShare().catch((error) => {
      console.log('Centralized sharing failed for Budget Bracket:', error)
      // Fallback handled by ShareSection using generateFallbackShareText()
    })
  }, [fetchShare])
  
  // Sum the box office (budget) of all correct answers
  // Use allRoundsData if available (for anonymous users and better accuracy), otherwise use result data
  const totalBudgetMastered = useMemo(() => {
    if (!result.revealed_pairs) return 0
    return result.revealed_pairs
      .filter(p => p.correct)
      .reduce((sum, pair) => {
        // Try to get budget data from allRoundsData first (more accurate)
        const roundData = allRoundsData.find(rd => rd.round === pair.round)
        
        let movieABudget = 0
        let movieBBudget = 0
        
        if (roundData && !loadingAnswers) {
          // Use the fetched budget data
          movieABudget = roundData.movieA?.budget || 0
          movieBBudget = roundData.movieB?.budget || 0
        } else {
          // Fall back to revealed_budgets from result
          movieABudget = pair.revealed_budgets?.movieA?.budget || 0
          movieBBudget = pair.revealed_budgets?.movieB?.budget || 0
        }
        
        const higherBudget = Math.max(movieABudget, movieBBudget)
        return sum + higherBudget
      }, 0)
  }, [result.revealed_pairs, allRoundsData, loadingAnswers])

  // Trigger celebration for perfect games or high scores
  useEffect(() => {
    if (result.is_perfect_game || correctAnswers >= 4) {
      setTimeout(() => {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }, 500)
    }
  }, [])
  
  // Automatically fetch all answers when component mounts
  useEffect(() => {
    fetchAllAnswers()
  }, [])
  
  // Fallback share text function for loading states or errors
  function generateFallbackShareText(): string {
    if (!result.revealed_pairs) {
      // If no revealed pairs, generate basic share text
      const pattern = '🟥'.repeat(5) // Assume all wrong if no data
      return `Budget Bracket #${puzzle.puzzle_number}\n${pattern}\n0/5 correct`
    }
    const choices: GameChoice[] = result.revealed_pairs.map(pair => ({
      round: pair.round,
      chosen_movie: pair.chosen_movie,
      correct: pair.correct,
      time_taken_ms: pair.time_taken_ms
    }))

    const pattern = generateSharePattern(choices)
    const timeText = formatGameTime(result.total_duration_ms)
    
    // Create the title with optional name on separate lines
    const baseTitle = `Budget Bracket #${puzzle.puzzle_number}`;
    const titleWithName = puzzle.name 
      ? `${baseTitle}\n${puzzle.name}\n${pattern}`
      : `${baseTitle} ${pattern}`;
    
    if (result.is_perfect_game) {
      return `${titleWithName}\nPerfect Producer! 🏆 • 5/5 correct • ${timeText}`
    } else if (correctAnswers === 0) {
      return `${titleWithName}\nWhomp, whomp 🎺 • 0/5 correct • ${timeText}`
    } else {
      return `${titleWithName}\n${correctAnswers}/5 correct • ${timeText}`
    }
  }


  const getMovieYear = (releaseDate: string) => {
    return new Date(releaseDate).getFullYear()
  }

  const fetchAllAnswers = async () => {
    setLoadingAnswers(true)
    
    try {
      const response = await fetch('/api/budget-bracket/reveal-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puzzle_id: puzzle.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch answers')
      }
      
      const data = await response.json()
      
      // Make sure we have valid data
      if (data.all_rounds && Array.isArray(data.all_rounds) && data.all_rounds.length > 0) {
        setAllRoundsData(data.all_rounds)
      } else {
        console.error('Invalid data structure received:', data)
        // Fallback to mock data if API fails
        const mockData = puzzle.pairs.map((pair, index) => ({
          round: index + 1,
          movieA: {
            tmdb_id: pair.movieA.tmdb_id,
            title: pair.movieA.title,
            poster_path: pair.movieA.poster_path,
            release_date: pair.movieA.release_date,
            budget: 100000000 + Math.random() * 100000000,
            budget_source: 'tmdb',
            is_estimated: false
          },
          movieB: {
            tmdb_id: pair.movieB.tmdb_id,
            title: pair.movieB.title,
            poster_path: pair.movieB.poster_path,
            release_date: pair.movieB.release_date,
            budget: 50000000 + Math.random() * 150000000,
            budget_source: 'tmdb',
            is_estimated: false
          },
          correct_choice: 'A',
          budget_difference: 50000000,
          difficulty_ratio: 2.0
        }))
        setAllRoundsData(mockData)
      }
    } catch (error) {
      console.error('Error fetching answers:', error)
      // Also provide fallback on network error
      const mockData = puzzle.pairs.map((pair, index) => ({
        round: index + 1,
        movieA: {
          tmdb_id: pair.movieA.tmdb_id,
          title: pair.movieA.title,
          poster_path: pair.movieA.poster_path,
          release_date: pair.movieA.release_date,
          budget: 100000000 + Math.random() * 100000000,
          budget_source: 'tmdb',
          is_estimated: false
        },
        movieB: {
          tmdb_id: pair.movieB.tmdb_id,
          title: pair.movieB.title,
          poster_path: pair.movieB.poster_path,
          release_date: pair.movieB.release_date,
          budget: 50000000 + Math.random() * 150000000,
          budget_source: 'tmdb',
          is_estimated: false
        },
        correct_choice: 'A',
        budget_difference: 50000000,
        difficulty_ratio: 2.0
      }))
      setAllRoundsData(mockData)
    } finally {
      setLoadingAnswers(false)
    }
  }


  // Celebration components
  const MoneyRain = () => (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={`money-${i}`}
          initial={{ y: -50, opacity: 0, rotate: 0 }}
          animate={{ 
            y: 300, 
            opacity: [0, 1, 1, 0], 
            rotate: [0, 180, 360],
            x: [0, Math.random() * 100 - 50]
          }}
          transition={{ 
            duration: 3, 
            delay: i * 0.1,
            ease: "easeOut"
          }}
          className="absolute text-green-500 font-bold pointer-events-none z-20 text-2xl"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: "0%"
          }}
        >
          💰
        </motion.div>
      ))}
    </>
  )

  const HollywoodSparkles = () => (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ 
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
            rotate: [0, 180]
          }}
          transition={{ 
            duration: 2, 
            delay: i * 0.2,
            ease: "easeOut"
          }}
          className="absolute text-yellow-400 pointer-events-none z-20 text-3xl"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 40}%`
          }}
        >
          ⭐
        </motion.div>
      ))}
    </>
  )

  return (
    <div className="space-y-4 relative">
      
      {/* Celebration Effects */}
      <AnimatePresence>
        {showCelebration && (
          <>
            <MoneyRain />
            <HollywoodSparkles />
            {result.is_perfect_game && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 1 }}
                className="absolute top-4 right-4 text-6xl z-30"
              >
                🏆
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Result Header */}
      {/* Puzzle Info Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-4"
      >
        <div className="text-lg font-bold text-gray-800">
          Budget Bracket #{puzzle.puzzle_number}
          {puzzle.name && (
            <span className="block text-base font-medium text-gray-600 mt-1">
              {puzzle.name}
            </span>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="border border-[rgb(var(--silver))] shadow-3d-grey" style={{ borderRadius: 0 }}>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
            >
              <CardTitle className="flex items-center justify-center gap-2">
                {result.is_perfect_game ? (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Crown className="w-8 h-8 text-yellow-500" />
                    </motion.div>
                    <span className="bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent text-2xl">
                      HOLLYWOOD MOGUL!
                    </span>
                    <Trophy className="w-8 h-8 text-yellow-500" />
                  </>
                ) : correctAnswers >= 4 ? (
                  <>
                    <Star className="w-6 h-6 text-purple-500" />
                    <span className="text-purple-600 text-xl">Executive Producer!</span>
                    <Star className="w-6 h-6 text-purple-500" />
                  </>
                ) : correctAnswers >= 3 ? (
                  <>
                    <Trophy className="w-6 h-6 text-blue-500" />
                    <span className="text-blue-600">Rising Producer</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-6 h-6" />
                    Game Complete
                  </>
                )}
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hollywood Achievement Banner */}
            {result.is_perfect_game && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="bg-gradient-to-r from-yellow-100 to-golden-100 border-2 border-yellow-300 p-4 text-center shadow-3d-gold"
              >
                <div className="flex items-center justify-center space-x-2 text-yellow-800">
                  <span className="text-2xl">🎬</span>
                  <span className="font-bold text-lg">Perfect Producer Achievement Unlocked!</span>
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  You&apos;ve mastered the art of budget prediction. Welcome to the penthouse!
                </div>
              </motion.div>
            )}

            {/* Budget Mastered Counter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 p-4 text-center shadow-3d-green"
            >
              <div className="flex items-center justify-center space-x-2 text-green-800">
                <span className="text-xl font-bold font-mono">
                  Budget Mastered: {
                    totalBudgetMastered >= 1_000_000_000
                      ? `$${(totalBudgetMastered / 1_000_000_000).toFixed(2)}B`
                      : `$${(totalBudgetMastered / 1_000_000).toFixed(1)}M`
                  }
                </span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Total production value from correct predictions
              </div>
            </motion.div>

            {/* Performance Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-b from-blue-50 to-blue-100 p-3 border border-blue-300 shadow-3d-blue"
                style={{ borderRadius: 0 }}
              >
                <div className="text-3xl font-bold text-blue-700">
                  {correctAnswers}/{result.rounds_completed}
                </div>
                <div className="text-sm text-blue-600 font-medium">Correct Calls</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-b from-purple-50 to-purple-100 p-3 border border-purple-300 shadow-3d-purple"
                style={{ borderRadius: 0 }}
              >
                <div className="text-3xl font-bold text-purple-700">{formatGameTime(result.total_duration_ms)}</div>
                <div className="text-sm text-purple-600 font-medium">Total Time</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-b from-orange-50 to-orange-100 p-3 border border-orange-300 shadow-3d-orange"
                style={{ borderRadius: 0 }}
              >
                <div className="text-3xl font-bold text-orange-700">
                  {result.updated_stats?.current_streak || 0}
                </div>
                <div className="text-sm text-orange-600 font-medium">Day Streak</div>
              </motion.div>
            </div>

            {/* Share Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="border-t pt-4"
            > 
              {/* Share Preview */}
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 border border-[#d1d2d4] p-4 text-center mb-3" style={{ borderRadius: 0 }}>
                {(() => {
                  const text = (centralizedShareText && !centralizedShareText.includes('0/5 correct') && correctAnswers > 0) 
                    ? centralizedShareText
                    : generateFallbackShareText()
                  
                  const lines = text.split('\n').filter(line => line.trim() !== '')
                  
                  if (lines.length >= 3) {
                    // Multi-line format: Budget Bracket #X, [Name], Pattern, Results
                    const gameTitle = lines[0] // "Budget Bracket #15"
                    
                    // Check if second line is a puzzle name (not emoji pattern)
                    const isSecondLineName = lines[1] && !lines[1].includes('🟩') && !lines[1].includes('🟥')
                    
                    if (isSecondLineName && lines.length >= 4) {
                      // Has puzzle name: Title, Name, Pattern, Results
                      const puzzleName = lines[1]
                      const pattern = lines[2]
                      const results = lines[3]
                      
                      return (
                        <>
                          <p className="font-mono text-lg mb-1">{gameTitle}</p>
                          <p className="font-mono text-base mb-2 text-muted-foreground">{puzzleName}</p>
                          <p className="font-mono text-2xl mb-2">{pattern}</p>
                          <p className="text-sm text-muted-foreground font-medium">{results}</p>
                        </>
                      )
                    } else {
                      // No puzzle name: Title, Pattern, Results
                      const pattern = lines[1]
                      const results = lines[2]
                      
                      return (
                        <>
                          <p className="font-mono text-lg mb-2">{gameTitle}</p>
                          <p className="font-mono text-2xl mb-2">{pattern}</p>
                          <p className="text-sm text-muted-foreground font-medium">{results}</p>
                        </>
                      )
                    }
                  }
                  
                  // Fallback for unexpected format
                  return (
                    <>
                      <p className="font-mono text-lg mb-1">{lines[0] || ''}</p>
                      {lines[1] && <p className="text-sm text-muted-foreground">{lines[1]}</p>}
                    </>
                  )
                })()}
              </div>
              
              <ShareSection 
                shareText={
                  // Prefer local data if centralized sharing returns wrong data (0/5 when we have correct answers)
                  (centralizedShareText && !centralizedShareText.includes('0/5 correct') && correctAnswers > 0) 
                    ? centralizedShareText 
                    : generateFallbackShareText()
                }
                shareUrl="https://cinamini.app/game/budget-bracket"
              />
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Round by Round Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <Card className="border border-[rgb(var(--silver))] shadow-3d-grey" style={{ borderRadius: 0 }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <span>🎭</span>
              <span>Round Breakdown</span>
              <span>📊</span>
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          {loadingAnswers ? (
            <div className="text-center py-8">
              <Clock className="w-6 h-6 mx-auto animate-spin mb-2" />
              <p className="text-muted-foreground">Loading round details...</p>
            </div>
          ) : allRoundsData.length > 0 ? (
            // Show all rounds with budget data
            allRoundsData.map((roundData) => {
              const wasPlayed = result.revealed_pairs?.some(r => r.round === roundData.round) || false
              const playedRound = result.revealed_pairs?.find(r => r.round === roundData.round)
              const chosenMovie = playedRound ? 
                (playedRound.chosen_movie === roundData.movieA.tmdb_id ? 'A' : 'B') : null
              
              return (
                <div key={roundData.round} className={`border border-[rgb(var(--silver))] shadow-3d-grey p-4 ${
                  !wasPlayed ? 'bg-muted/30 border-dashed' : ''
                }`} style={{ borderRadius: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={wasPlayed ? "secondary" : "outline"}>
                        Round {roundData.round}
                      </Badge>
                      {!wasPlayed && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Not Played
                        </Badge>
                      )}
                    </div>
                    {wasPlayed && playedRound && (
                      <div className="flex items-center gap-2">
                        {playedRound.correct ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatGameTime(playedRound.time_taken_ms)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Movie Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Movie A */}
                    <div className={`text-center p-2 ${
                      !wasPlayed ? 'bg-muted/20' :
                      chosenMovie === 'A' 
                        ? playedRound?.correct 
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'bg-red-50 border border-red-200 shadow-3d-red'
                        : roundData.correct_choice === 'A' && chosenMovie !== 'A' && chosenMovie !== null
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-muted overflow-hidden mb-2 max-w-20 mx-auto border border-[#d1d2d4] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)] relative" style={{ borderRadius: 0 }}>
                        <Image
                          src={getPosterUrl(roundData.movieA.poster_path, 'w185')}
                          alt={`${roundData.movieA.title} poster`}
                          fill
                          className={`object-cover ${
                            roundData.correct_choice === 'A' && chosenMovie !== 'A' && chosenMovie !== null
                              ? 'opacity-60' 
                              : ''
                          }`}
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-medium leading-tight mb-1">
                        {roundData.movieA.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getMovieYear(roundData.movieA.release_date)}
                      </div>
                      <div className="text-sm font-mono">
                        {formatBudget(roundData.movieA.budget, roundData.movieA.is_estimated)}
                      </div>
                      {chosenMovie === 'A' && wasPlayed && (
                        <div className="text-xs mt-1 font-medium">
                          Your Choice
                        </div>
                      )}
                      {!wasPlayed && roundData.correct_choice === 'A' && (
                        <div className="text-xs mt-1 font-medium text-green-600">
                          Correct Answer
                        </div>
                      )}
                    </div>

                    {/* Movie B */}
                    <div className={`text-center p-2 ${
                      !wasPlayed ? 'bg-muted/20' :
                      chosenMovie === 'B' 
                        ? playedRound?.correct 
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'bg-red-50 border border-red-200 shadow-3d-red'
                        : roundData.correct_choice === 'B' && chosenMovie !== 'B' && chosenMovie !== null
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-muted overflow-hidden mb-2 max-w-20 mx-auto border border-[#d1d2d4] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)] relative" style={{ borderRadius: 0 }}>
                        <Image
                          src={getPosterUrl(roundData.movieB.poster_path, 'w185')}
                          alt={`${roundData.movieB.title} poster`}
                          fill
                          className={`object-cover ${
                            roundData.correct_choice === 'B' && chosenMovie !== 'B' && chosenMovie !== null
                              ? 'opacity-60' 
                              : ''
                          }`}
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-medium leading-tight mb-1">
                        {roundData.movieB.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getMovieYear(roundData.movieB.release_date)}
                      </div>
                      <div className="text-sm font-mono">
                        {formatBudget(roundData.movieB.budget, roundData.movieB.is_estimated)}
                      </div>
                      {chosenMovie === 'B' && wasPlayed && (
                        <div className="text-xs mt-1 font-medium">
                          Your Choice
                        </div>
                      )}
                      {!wasPlayed && roundData.correct_choice === 'B' && (
                        <div className="text-xs mt-1 font-medium text-green-600">
                          Correct Answer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Result Summary */}
                  <div className="mt-3 text-center text-sm">
                    {wasPlayed && playedRound ? (
                      playedRound.correct ? (
                        <div className="text-green-600">
                          🟩 Correct! Difference: {roundData.budget_difference.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </div>
                      ) : (
                        <div className="text-cinema-red">
                          🟥 Wrong. {roundData[roundData.correct_choice === 'A' ? 'movieA' : 'movieB'].title} had the higher budget.
                        </div>
                      )
                    ) : (
                      <div className="text-muted-foreground">
                        💰 {roundData[roundData.correct_choice === 'A' ? 'movieA' : 'movieB'].title} has the higher budget 
                        (Difference: {roundData.budget_difference.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })})
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : result.revealed_pairs ? (
            // Show only played rounds (original behavior)
            result.revealed_pairs.map((roundData) => {
              const pair = puzzle.pairs.find(p => p.round === roundData.round)!
              const chosenMovie = roundData.chosen_movie === roundData.revealed_budgets.movieA.tmdb_id ? 'A' : 'B'
              
              return (
                <div key={roundData.round} className="border border-[rgb(var(--silver))] shadow-3d-grey p-4" style={{ borderRadius: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary">Round {roundData.round}</Badge>
                    <div className="flex items-center gap-2">
                      {roundData.correct ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatGameTime(roundData.time_taken_ms)}
                      </span>
                    </div>
                  </div>

                  {/* Movie Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Movie A */}
                    <div className={`text-center p-2 ${
                      chosenMovie === 'A' 
                        ? roundData.correct 
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'bg-red-50 border border-red-200 shadow-3d-red'
                        : roundData.correct_choice === 'A' && chosenMovie !== 'A' && chosenMovie !== null
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-muted overflow-hidden mb-2 max-w-20 mx-auto border border-[#d1d2d4] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)] relative" style={{ borderRadius: 0 }}>
                        <Image
                          src={getPosterUrl(pair.movieA.poster_path, 'w185')}
                          alt={`${pair.movieA.title} poster`}
                          fill
                          className={`object-cover ${
                            roundData.correct_choice === 'A' && chosenMovie !== 'A' && chosenMovie !== null
                              ? 'opacity-60' 
                              : ''
                          }`}
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-medium leading-tight mb-1">
                        {roundData.revealed_budgets.movieA.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getMovieYear(pair.movieA.release_date)}
                      </div>
                      <div className="text-sm font-mono">
                        {formatBudget(roundData.revealed_budgets.movieA.budget, roundData.revealed_budgets.movieA.is_estimated)}
                      </div>
                      {chosenMovie === 'A' && (
                        <div className="text-xs mt-1 font-medium">
                          Your Choice
                        </div>
                      )}
                    </div>

                    {/* Movie B */}
                    <div className={`text-center p-2 ${
                      chosenMovie === 'B' 
                        ? roundData.correct 
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'bg-red-50 border border-red-200 shadow-3d-red'
                        : roundData.correct_choice === 'B' && chosenMovie !== 'B' && chosenMovie !== null
                          ? 'bg-green-50 border border-green-200 shadow-3d-green'
                          : 'opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-muted overflow-hidden mb-2 max-w-20 mx-auto border border-[#d1d2d4] shadow-[1px_1px_0px_rgb(209,210,212),2px_2px_0px_rgb(209,210,212),3px_3px_0px_rgb(209,210,212),4px_4px_0px_rgb(209,210,212)] relative" style={{ borderRadius: 0 }}>
                        <Image
                          src={getPosterUrl(pair.movieB.poster_path, 'w185')}
                          alt={`${pair.movieB.title} poster`}
                          fill
                          className={`object-cover ${
                            roundData.correct_choice === 'B' && chosenMovie !== 'B' && chosenMovie !== null
                              ? 'opacity-60' 
                              : ''
                          }`}
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-medium leading-tight mb-1">
                        {roundData.revealed_budgets.movieB.title}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getMovieYear(pair.movieB.release_date)}
                      </div>
                      <div className="text-sm font-mono">
                        {formatBudget(roundData.revealed_budgets.movieB.budget, roundData.revealed_budgets.movieB.is_estimated)}
                      </div>
                      {chosenMovie === 'B' && (
                        <div className="text-xs mt-1 font-medium">
                          Your Choice
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Result Summary */}
                  <div className="mt-3 text-center text-sm">
                    {roundData.correct ? (
                      <div className="text-green-600">
                        🟩 Correct! Difference: {roundData.budget_difference.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </div>
                    ) : (
                      <div className="text-cinema-red">
                        🟥 Wrong. {roundData.revealed_budgets[roundData.correct_choice === 'A' ? 'movieA' : 'movieB'].title} had the higher budget.
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            // No revealed pairs available
            <div className="text-center py-8">
              <p className="text-muted-foreground">No game data available</p>
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>

    </div>
  )
}