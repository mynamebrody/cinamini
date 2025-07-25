import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BudgetRequest {
  movieA_tmdb_id: number
  movieB_tmdb_id: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    // Get budget data for both movies
    const { data: movies, error } = await supabase
      .from('budget_bracket_movies')
      .select('tmdb_id, title, production_budget, budget_source, is_budget_estimated')
      .in('tmdb_id', [movieA_tmdb_id, movieB_tmdb_id])

    if (error) {
      console.error('Error fetching movie budgets:', error)
      return NextResponse.json({ error: 'Failed to fetch movie data' }, { status: 500 })
    }

    if (!movies || movies.length !== 2) {
      return NextResponse.json({ error: 'Movie data not found' }, { status: 404 })
    }

    // Sort movies to match the request order
    const movieA = movies.find((m: any) => m.tmdb_id === movieA_tmdb_id)
    const movieB = movies.find((m: any) => m.tmdb_id === movieB_tmdb_id)

    if (!movieA || !movieB) {
      return NextResponse.json({ error: 'Movie data incomplete' }, { status: 404 })
    }

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