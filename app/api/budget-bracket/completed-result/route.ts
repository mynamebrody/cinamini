import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enrichMoviesWithDetails } from '@/lib/tmdb'
import type { BudgetBracketMovie, MoviePair } from '@/lib/budget-bracket'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseService = createServiceClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { puzzle_id } = body

    if (!puzzle_id) {
      return NextResponse.json({ error: 'Missing puzzle_id' }, { status: 400 })
    }

    // Get the user's completed game
    const { data: game, error: gameError } = await supabase
      .from('budget_bracket_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzle_id)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Get the puzzle data (using service client to bypass RLS)
    const { data: puzzle, error: puzzleError } = await supabaseService
      .from('budget_bracket_puzzles')
      .select('*')
      .eq('id', puzzle_id)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })
    }

    // Extract movie pairs and choices
    const moviePairs = puzzle.pairs as MoviePair[]
    const userChoices = game.choices as Array<{
      round: number
      chosen_movie: number
      correct: boolean
      time_taken_ms: number
    }>

    // Get all unique movies for budget data
    const allMovies: BudgetBracketMovie[] = []
    moviePairs.forEach(pair => {
      allMovies.push(pair.movieA, pair.movieB)
    })

    // Remove duplicates
    const uniqueMovies = allMovies.reduce((acc, movie) => {
      if (!acc.find(m => m.tmdb_id === movie.tmdb_id)) {
        acc.push(movie)
      }
      return acc
    }, [] as BudgetBracketMovie[])

    // Fetch current budget data from TMDB
    const enrichedMovies = await enrichMoviesWithDetails(uniqueMovies.map(m => ({
      id: m.tmdb_id,
      title: m.title,
      poster_path: m.poster_path,
      release_date: m.release_date,
      popularity: m.popularity_score
    })))

    // Create budget lookup map
    const budgetMap = new Map()
    enrichedMovies.forEach(movie => {
      budgetMap.set(movie.id, {
        budget: movie.budget || 0,
        budget_source: 'tmdb',
        is_estimated: false
      })
    })

    // Build revealed pairs with budget information
    const revealedPairs = userChoices.map(choice => {
      const pair = moviePairs.find(p => p.round === choice.round)!
      
      const movieABudget = budgetMap.get(pair.movieA.tmdb_id)?.budget || pair.movieA.production_budget || 0
      const movieBBudget = budgetMap.get(pair.movieB.tmdb_id)?.budget || pair.movieB.production_budget || 0
      
      const correct_choice = movieABudget > movieBBudget ? 'A' : 'B'
      const budget_difference = Math.abs(movieABudget - movieBBudget)
      const difficulty_ratio = movieABudget > movieBBudget ? 
        movieABudget / movieBBudget : 
        movieBBudget / movieABudget

      return {
        round: choice.round,
        chosen_movie: choice.chosen_movie,
        correct: choice.correct,
        time_taken_ms: choice.time_taken_ms,
        revealed_budgets: {
          movieA: {
            tmdb_id: pair.movieA.tmdb_id,
            title: pair.movieA.title,
            budget: movieABudget,
            budget_source: budgetMap.get(pair.movieA.tmdb_id)?.budget_source || 'tmdb',
            is_estimated: budgetMap.get(pair.movieA.tmdb_id)?.is_estimated || false
          },
          movieB: {
            tmdb_id: pair.movieB.tmdb_id,
            title: pair.movieB.title,
            budget: movieBBudget,
            budget_source: budgetMap.get(pair.movieB.tmdb_id)?.budget_source || 'tmdb',
            is_estimated: budgetMap.get(pair.movieB.tmdb_id)?.is_estimated || false
          }
        },
        correct_choice,
        budget_difference,
        difficulty_ratio
      }
    })

    // Get user stats
    const { data: userStats } = await supabase
      .from('budget_bracket_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Build the complete game result
    const gameResult = {
      game_id: game.id,
      rounds_completed: game.rounds_completed,
      final_result: game.final_result,
      is_perfect_game: game.is_perfect_game,
      total_duration_ms: game.total_duration_ms,
      revealed_pairs: revealedPairs,
      updated_stats: userStats || {
        current_streak: 0,
        games_played: 0,
        perfect_games: 0,
        best_streak: 0
      }
    }

    return NextResponse.json(gameResult)

  } catch (error) {
    console.error('Error in completed-result API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}