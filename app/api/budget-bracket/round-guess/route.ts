import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { type MoviePair } from '@/lib/budget-bracket'
import { sendGuessWebhook } from '@/lib/webhooks'
import { getMovieById } from '@/lib/tmdb'

interface RoundGuessRequest {
  puzzle_id: number
  puzzle_number: number
  round: number
  chosen_movie_tmdb_id: number
  round_time_ms: number
  cumulative_time_ms: number
  game_choices: Array<{
    round: number
    chosen_movie: number
    correct: boolean
    time_taken_ms: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseService = createServiceClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()

    const body: RoundGuessRequest = await request.json()
    const { 
      puzzle_id, 
      puzzle_number,
      round, 
      chosen_movie_tmdb_id, 
      round_time_ms, 
      cumulative_time_ms,
      game_choices 
    } = body

    // Validate input
    if (!puzzle_id || !round || !chosen_movie_tmdb_id || round < 1 || round > 5) {
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

    // Get the movie pair for this round
    const moviePairs = puzzle.pairs as MoviePair[]
    const currentPair = moviePairs.find(p => p.round === round)

    if (!currentPair) {
      return NextResponse.json({ error: `Round ${round} not found` }, { status: 400 })
    }

    // Verify the answer for this round
    const chosenMovie = chosen_movie_tmdb_id === currentPair.movieA.tmdb_id ? 'A' : 'B'
    const isCorrect = chosenMovie === currentPair.correctChoice

    // Get movie titles for webhook
    const chosenMovieData = await getMovieById(chosen_movie_tmdb_id)
    const chosenMovieTitle = chosenMovieData?.title || 'Unknown Movie'

    // Calculate progress data
    const currentChoices = [...game_choices, {
      round,
      chosen_movie: chosen_movie_tmdb_id,
      correct: isCorrect,
      time_taken_ms: round_time_ms
    }]
    
    const roundsCompleted = currentChoices.length
    const correctRounds = currentChoices.filter(c => c.correct).length
    const isGameComplete = round === 5
    const isPerfectGame = correctRounds === roundsCompleted && roundsCompleted === 5

    // Prepare webhook data
    const webhookData = {
      event: 'guess' as const,
      game: 'budget-bracket' as const,
      user: user 
        ? { isAuthenticated: true, id: user.id, email: user.email ?? null }
        : { isAuthenticated: false },
      guess: {
        puzzleId: puzzle_id,
        puzzleNumber: puzzle_number,
        round,
        chosenMovieTmdbId: chosen_movie_tmdb_id,
        chosenMovieTitle,
        timeTakenMs: round_time_ms,
        cumulativeTimeMs: cumulative_time_ms,
        correct: isCorrect
      },
      progress: {
        currentRound: round,
        roundsCompleted,
        correctRounds,
        isGameComplete,
        isPerfectGame,
        choices: currentChoices.map(choice => ({
          round: choice.round,
          chosenMovieTmdbId: choice.chosen_movie,
          timeTakenMs: choice.time_taken_ms,
          correct: choice.correct
        }))
      },
      correctAnswer: {
        movieA: {
          tmdb_id: currentPair.movieA.tmdb_id,
          title: currentPair.movieA.title,
          budget: currentPair.movieA.production_budget,
          budget_source: currentPair.movieA.budget_source,
          is_estimated: currentPair.movieA.is_budget_estimated
        },
        movieB: {
          tmdb_id: currentPair.movieB.tmdb_id,
          title: currentPair.movieB.title,
          budget: currentPair.movieB.production_budget,
          budget_source: currentPair.movieB.budget_source,
          is_estimated: currentPair.movieB.is_budget_estimated
        },
        correctChoice: currentPair.correctChoice,
        budgetDifference: currentPair.budgetDifference
      }
    }

    // Fire webhook (fire-and-forget)
    sendGuessWebhook(request, webhookData).catch(error => 
      console.error(`Webhook error (round ${round}):`, error)
    )

    // Return the round result data for the UI
    return NextResponse.json({
      correct: isCorrect,
      round,
      cumulative_time_ms,
      rounds_completed: roundsCompleted,
      correct_rounds: correctRounds,
      is_game_complete: isGameComplete,
      is_perfect_game: isPerfectGame,
      revealed_budgets: {
        movieA: {
          tmdb_id: currentPair.movieA.tmdb_id,
          title: currentPair.movieA.title,
          budget: currentPair.movieA.production_budget,
          budget_source: currentPair.movieA.budget_source,
          is_estimated: currentPair.movieA.is_budget_estimated
        },
        movieB: {
          tmdb_id: currentPair.movieB.tmdb_id,
          title: currentPair.movieB.title,
          budget: currentPair.movieB.production_budget,
          budget_source: currentPair.movieB.budget_source,
          is_estimated: currentPair.movieB.is_budget_estimated
        }
      },
      correct_choice: currentPair.correctChoice,
      budget_difference: currentPair.budgetDifference,
      difficulty_ratio: currentPair.difficultyRatio
    })

  } catch (error) {
    console.error('Unexpected error in Budget Bracket round guess API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}