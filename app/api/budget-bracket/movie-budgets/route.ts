import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { type MoviePair, type BudgetBracketMovie } from '@/lib/budget-bracket'

interface BudgetRequest {
  movieA_tmdb_id: number
  movieB_tmdb_id: number
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

    const body: BudgetRequest = await request.json()
    const { movieA_tmdb_id, movieB_tmdb_id } = body

    // Validate input
    if (!movieA_tmdb_id || !movieB_tmdb_id) {
      return NextResponse.json({ error: 'Movie IDs are required' }, { status: 400 })
    }

    // Get today's puzzle to extract budget data from movie pairs (using service client to bypass RLS)
    const today = new Date().toISOString().split('T')[0]
    const { data: puzzle, error: puzzleError } = await supabaseService
      .from('budget_bracket_puzzles')
      .select('pairs')
      .eq('puzzle_date', today)
      .single()

    if (puzzleError || !puzzle) {
      console.error('Error fetching today\'s puzzle:', puzzleError)
      return NextResponse.json({ error: 'Today\'s puzzle not found' }, { status: 404 })
    }

    // Find the pair containing these movies
    const moviePairs = puzzle.pairs as MoviePair[]
    const targetPair = moviePairs.find(pair => 
      (pair.movieA.tmdb_id === movieA_tmdb_id && pair.movieB.tmdb_id === movieB_tmdb_id) ||
      (pair.movieA.tmdb_id === movieB_tmdb_id && pair.movieB.tmdb_id === movieA_tmdb_id)
    )

    if (!targetPair) {
      return NextResponse.json({ error: 'Movie pair not found in today\'s puzzle' }, { status: 404 })
    }

    // Extract budget data from the pair
    const movieA: BudgetBracketMovie = targetPair.movieA.tmdb_id === movieA_tmdb_id 
      ? targetPair.movieA 
      : targetPair.movieB
    const movieB: BudgetBracketMovie = targetPair.movieA.tmdb_id === movieB_tmdb_id 
      ? targetPair.movieA 
      : targetPair.movieB

    const response = {
      movieA: {
        tmdb_id: movieA.tmdb_id,
        title: movieA.title,
        budget: movieA.production_budget,
        budget_source: movieA.budget_source,
        is_estimated: movieA.is_budget_estimated
      },
      movieB: {
        tmdb_id: movieB.tmdb_id,
        title: movieB.title,
        budget: movieB.production_budget,
        budget_source: movieB.budget_source,
        is_estimated: movieB.is_budget_estimated
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Unexpected error in movie budgets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 