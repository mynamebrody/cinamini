import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  calculateFinalResult,
  type GameChoice,
  type MoviePair 
} from '@/lib/budget-bracket'
import { sendGuessWebhook } from '@/lib/webhooks'

interface GuessRequest {
  puzzle_id: number
  round: number
  chosen_movie_tmdb_id: number
  time_taken_ms: number
  game_start_time?: number // For first round only
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()

    const body: GuessRequest = await request.json()
    const { puzzle_id, round, chosen_movie_tmdb_id, time_taken_ms, game_start_time } = body

    // Validate input
    if (!puzzle_id || !round || !chosen_movie_tmdb_id || round < 1 || round > 5) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    if (!user) {
      // For anonymous users, send webhook but don't save to database
      await sendGuessWebhook(request, {
        event: 'guess',
        game: 'budget-bracket',
        user: { isAuthenticated: false },
        guess: {
          puzzleId: puzzle_id,
          round,
          chosenMovieTmdbId: chosen_movie_tmdb_id,
          timeTakenMs: time_taken_ms,
        },
        progress: { 
          round, 
          isGameComplete: false, // Anonymous users can't track game completion server-side
        },
      })

      return NextResponse.json({
        message: "Anonymous play - results not saved",
        anonymous: true,
        correct: false, // Anonymous users don't get server-side validation
        game_complete: false,
      })
    }

    // Get the puzzle data
    const { data: puzzle, error: puzzleError } = await supabase
      .from('budget_bracket_puzzles')
      .select('*')
      .eq('id', puzzle_id)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })
    }

    const moviePairs = puzzle.pairs as MoviePair[]
    const currentPair = moviePairs.find(p => p.round === round)

    if (!currentPair) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
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

    // Determine if the guess is correct
    const chosenMovie = chosen_movie_tmdb_id === currentPair.movieA.tmdb_id ? 'A' : 'B'
    const isCorrect = chosenMovie === currentPair.correctChoice

    // Get or create the current game choices
    let gameChoices: GameChoice[] = []
    
    if (round === 1) {
      // This is a new game
      gameChoices = [{
        round,
        chosen_movie: chosen_movie_tmdb_id,
        correct: isCorrect,
        time_taken_ms
      }]
    } else {
      // For subsequent rounds, this is handled by the frontend state management
      // The game should track all choices and submit the final result
      return NextResponse.json({ error: 'Multi-round games should be handled by frontend state' }, { status: 400 })
    }

    // Calculate game result
    const isGameComplete = !isCorrect || round === 5
    const finalResult = calculateFinalResult(gameChoices)
    const totalDuration = game_start_time ? Date.now() - game_start_time : time_taken_ms

    // Save the game result
    const { error: gameError } = await supabase
      .from('budget_bracket_games')
      .insert({
        user_id: user.id,
        puzzle_id,
        rounds_completed: round,
        final_result: finalResult,
        choices: gameChoices,
        total_duration_ms: totalDuration
      })
      .select()
      .single()

    if (gameError) {
      console.error('Error saving game:', gameError)
      return NextResponse.json({ error: 'Failed to save game' }, { status: 500 })
    }

    // Update user statistics
    await updateUserStats(supabase, user.id, gameChoices, isCorrect, round === 5 && isCorrect)

    // Prepare response with revealed information
    const response = {
      correct: isCorrect,
      game_complete: isGameComplete,
      rounds_completed: round,
      final_result: finalResult,
      revealed_budgets: {
        movieA: {
          title: currentPair.movieA.title,
          budget: currentPair.movieA.production_budget,
          budget_source: currentPair.movieA.budget_source,
          is_estimated: currentPair.movieA.is_budget_estimated
        },
        movieB: {
          title: currentPair.movieB.title,
          budget: currentPair.movieB.production_budget,
          budget_source: currentPair.movieB.budget_source,
          is_estimated: currentPair.movieB.is_budget_estimated
        }
      },
      correct_choice: currentPair.correctChoice,
      budget_difference: currentPair.budgetDifference,
      next_round: isCorrect && round < 5 ? round + 1 : null
    }

    // Fire webhook for authenticated guess (round 1 only on server)
    await sendGuessWebhook(request, {
      event: 'guess',
      game: 'budget-bracket',
      user: { isAuthenticated: true, id: user.id, email: user.email ?? null },
      guess: {
        puzzleId: puzzle_id,
        round,
        chosenMovieTmdbId: chosen_movie_tmdb_id,
        timeTakenMs: time_taken_ms,
      },
      progress: { round, isGameComplete },
      correctAnswer: {
        correctChoice: currentPair.correctChoice,
        budgetDifference: currentPair.budgetDifference,
        isCorrect,
      },
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Unexpected error in Budget Bracket guess API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateUserStats(
  supabase: any, 
  userId: string, 
  choices: GameChoice[], 
  lastGuessCorrect: boolean, 
  isPerfectGame: boolean
) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Get current stats
    const { data: currentStats } = await supabase
      .from('budget_bracket_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    const roundsCompleted = choices.length
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

      await supabase
        .from('budget_bracket_user_stats')
        .update(newStats)
        .eq('user_id', userId)
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

      await supabase
        .from('budget_bracket_user_stats')
        .insert(newStats)
    }
  } catch (error) {
    console.error('Error updating user stats:', error)
    // Don't fail the main request if stats update fails
  }
}

function isConsecutiveDay(lastDate: string, today: string): boolean {
  const last = new Date(lastDate)
  const current = new Date(today)
  const diffTime = current.getTime() - last.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays === 1
}