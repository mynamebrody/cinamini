import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type MoviePair, type BudgetBracketMovie } from '@/lib/budget-bracket'
import { getMovieDetails } from '@/lib/tmdb'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { movieA_tmdb_id, movieB_tmdb_id } = body

    // Enhanced debugging
    console.log('Budget API received body:', JSON.stringify(body))
    console.log('movieA_tmdb_id:', movieA_tmdb_id, 'type:', typeof movieA_tmdb_id)
    console.log('movieB_tmdb_id:', movieB_tmdb_id, 'type:', typeof movieB_tmdb_id)

    // Validate input
    if (!movieA_tmdb_id || !movieB_tmdb_id) {
      console.error('Missing movie IDs - movieA_tmdb_id:', movieA_tmdb_id, 'movieB_tmdb_id:', movieB_tmdb_id)
      return NextResponse.json({ 
        error: 'Movie IDs are required',
        received: { movieA_tmdb_id, movieB_tmdb_id }
      }, { status: 400 })
    }

    // No authentication required - this is public data
    const supabase = await createClient()

    // Get today's puzzle to extract budget data from movie pairs (using service client to bypass RLS)
    const today = new Date().toISOString().split('T')[0]
    const { data: puzzle, error: puzzleError } = await supabase
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

    // Helper function to get release date, hydrating from TMDB if missing
    const getReleaseDateWithHydration = async (movie: BudgetBracketMovie): Promise<string | null> => {
      // If we already have a valid release_date, use it
      if (movie.release_date && movie.release_date.trim() !== '') {
        return movie.release_date
      }
      
      // Otherwise, fetch from TMDB API in real-time
      console.log(`Hydrating release date for movie: ${movie.title} (ID: ${movie.tmdb_id})`)
      try {
        const details = await getMovieDetails(movie.tmdb_id)
        return details?.release_date || null
      } catch (error) {
        console.error(`Failed to hydrate release date for ${movie.title}:`, error)
        return null
      }
    }

    // Hydrate release dates for both movies in parallel
    const [movieARelease, movieBRelease] = await Promise.all([
      getReleaseDateWithHydration(movieA),
      getReleaseDateWithHydration(movieB)
    ])

    const response = {
      movieA: {
        tmdb_id: movieA.tmdb_id,
        title: movieA.title,
        budget: movieA.production_budget,
        budget_source: movieA.budget_source,
        is_estimated: movieA.is_budget_estimated,
        release_date: movieARelease
      },
      movieB: {
        tmdb_id: movieB.tmdb_id,
        title: movieB.title,
        budget: movieB.production_budget,
        budget_source: movieB.budget_source,
        is_estimated: movieB.is_budget_estimated,
        release_date: movieBRelease
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Unexpected error in movie budgets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 