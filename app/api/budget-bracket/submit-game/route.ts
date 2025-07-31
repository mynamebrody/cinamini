import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { 
  calculateFinalResult,
  type GameChoice,
  type MoviePair 
} from '@/lib/budget-bracket'

interface SubmitGameRequest {
  puzzle_id: number
  choices: GameChoice[]
  total_duration_ms: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseService = createServiceClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SubmitGameRequest = await request.json()
    const { puzzle_id, choices, total_duration_ms } = body

    // Validate input
    if (!puzzle_id || !choices || !Array.isArray(choices) || choices.length === 0) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    // Get the puzzle data to verify answers (using service client to bypass RLS)
    const { data: puzzle, error: puzzleError } = await supabaseService
      .from('budget_bracket_puzzles')
      .select('*')
      .eq('id', puzzle_id)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })
    }

    // Check if user has already played this puzzle
    const { data: existingGame } = await supabase
      .from('budget_bracket_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzle_id)
      .single()

    if (existingGame) {
      return NextResponse.json({ error: 'Already played this puzzle' }, { status: 400 })
    }

    // Verify all answers and calculate final results
    const moviePairs = puzzle.movie_pairs as MoviePair[]
    const verifiedChoices: GameChoice[] = []
    let gameEnded = false

    for (const choice of choices) {
      const pair = moviePairs.find(p => p.round === choice.round)
      if (!pair) {
        return NextResponse.json({ error: `Invalid round ${choice.round}` }, { status: 400 })
      }

      const chosenMovie = choice.chosen_movie === pair.movieA.tmdb_id ? 'A' : 'B'
      const isCorrect = chosenMovie === pair.correctChoice

      verifiedChoices.push({
        ...choice,
        correct: isCorrect
      })

      // If this choice was wrong, the game ends here
      if (!isCorrect) {
        gameEnded = true
        break
      }
    }

    const roundsCompleted = verifiedChoices.length
    const finalResult = calculateFinalResult(verifiedChoices)
    const isPerfectGame = roundsCompleted === 5

    // Save the game result
    const { data: gameResult, error: gameError } = await supabase
      .from('budget_bracket_games')
      .insert({
        user_id: user.id,
        puzzle_id,
        rounds_completed: roundsCompleted,
        final_result: finalResult,
        choices: verifiedChoices,
        total_duration_ms
      })
      .select()
      .single()

    if (gameError) {
      console.error('Error saving game:', gameError)
      return NextResponse.json({ error: 'Failed to save game' }, { status: 500 })
    }

    // Update user statistics
    const updatedStats = await updateUserStats(supabase, user.id, verifiedChoices, isPerfectGame)

    // Prepare detailed response with all revealed information
    const revealedPairs = verifiedChoices.map(choice => {
      const pair = moviePairs.find(p => p.round === choice.round)!
      return {
        round: choice.round,
        chosen_movie: choice.chosen_movie,
        correct: choice.correct,
        time_taken_ms: choice.time_taken_ms,
        revealed_budgets: {
          movieA: {
            tmdb_id: pair.movieA.tmdb_id,
            title: pair.movieA.title,
            budget: pair.movieA.production_budget,
            budget_source: pair.movieA.budget_source,
            is_estimated: pair.movieA.is_budget_estimated
          },
          movieB: {
            tmdb_id: pair.movieB.tmdb_id,
            title: pair.movieB.title,
            budget: pair.movieB.production_budget,
            budget_source: pair.movieB.budget_source,
            is_estimated: pair.movieB.is_budget_estimated
          }
        },
        correct_choice: pair.correctChoice,
        budget_difference: pair.budgetDifference,
        difficulty_ratio: pair.difficultyRatio
      }
    })

    const response = {
      game_id: gameResult.id,
      rounds_completed: roundsCompleted,
      final_result: finalResult,
      is_perfect_game: isPerfectGame,
      total_duration_ms,
      revealed_pairs: revealedPairs,
      updated_stats: updatedStats
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Unexpected error in Budget Bracket submit game API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateUserStats(
  supabase: any, 
  userId: string, 
  choices: GameChoice[], 
  isPerfectGame: boolean
) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const roundsCompleted = choices.length
    
    // Get current stats
    const { data: currentStats } = await supabase
      .from('budget_bracket_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    const wasStreakBroken = currentStats?.last_played_date && 
      currentStats.last_played_date !== today && 
      !isConsecutiveDay(currentStats.last_played_date, today)

    const newStreak = wasStreakBroken ? 1 : (currentStats?.current_streak || 0) + 1

    if (currentStats) {
      // Update existing stats
      const newStats = {
        games_played: currentStats.games_played + 1,
        perfect_games: currentStats.perfect_games + (isPerfectGame ? 1 : 0),
        current_streak: newStreak,
        best_streak: Math.max(currentStats.best_streak, newStreak),
        total_rounds_won: currentStats.total_rounds_won + roundsCompleted,
        average_round_reached: 
          (currentStats.total_rounds_won + roundsCompleted) / (currentStats.games_played + 1),
        last_played_date: today
      }

      const { data: updatedStats } = await supabase
        .from('budget_bracket_stats')
        .update(newStats)
        .eq('user_id', userId)
        .select()
        .single()

      return updatedStats || newStats
    } else {
      // Create new stats
      const newStats = {
        user_id: userId,
        games_played: 1,
        perfect_games: isPerfectGame ? 1 : 0,
        current_streak: 1,
        best_streak: 1,
        total_rounds_won: roundsCompleted,
        average_round_reached: roundsCompleted,
        last_played_date: today
      }

      const { data: createdStats } = await supabase
        .from('budget_bracket_stats')
        .insert(newStats)
        .select()
        .single()

      return createdStats || newStats
    }
  } catch (error) {
    console.error('Error updating user stats:', error)
    return null
  }
}

function isConsecutiveDay(lastDate: string, today: string): boolean {
  const last = new Date(lastDate)
  const current = new Date(today)
  const diffTime = current.getTime() - last.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays === 1
}