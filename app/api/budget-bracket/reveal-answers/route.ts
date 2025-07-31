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

    // Get the puzzle data (using service client to bypass RLS)
    const { data: puzzle, error: puzzleError } = await supabaseService
      .from('budget_bracket_puzzles')
      .select('*')
      .eq('id', puzzle_id)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })
    }

    // Extract all unique movie IDs from the puzzle pairs
    const moviePairs = puzzle.movie_pairs as MoviePair[]
    const allMovieIds = new Set<number>()
    
    moviePairs.forEach(pair => {
      allMovieIds.add(pair.movieA.tmdb_id)
      allMovieIds.add(pair.movieB.tmdb_id)
    })

    // Get basic movie data for all movies in the puzzle
    const movieArray: BudgetBracketMovie[] = []
    moviePairs.forEach(pair => {
      movieArray.push(pair.movieA, pair.movieB)
    })

    // Remove duplicates based on tmdb_id
    const uniqueMovies = movieArray.reduce((acc, movie) => {
      if (!acc.find(m => m.tmdb_id === movie.tmdb_id)) {
        acc.push(movie)
      }
      return acc
    }, [] as BudgetBracketMovie[])

    // Fetch budget details from TMDB for all movies
    const enrichedMovies = await enrichMoviesWithDetails(uniqueMovies.map(m => ({
      id: m.tmdb_id,
      title: m.title,
      poster_path: m.poster_path,
      release_date: m.release_date,
      popularity: m.popularity_score
    })))

    // Create a lookup map for enriched movie data
    const enrichedMovieMap = new Map()
    enrichedMovies.forEach(movie => {
      enrichedMovieMap.set(movie.id, {
        budget: movie.budget || 0,
        budget_source: 'tmdb',
        is_estimated: false
      })
    })

    // Process all rounds with complete budget information
    const allRoundsData = moviePairs.map(pair => {
      const movieABudget = enrichedMovieMap.get(pair.movieA.tmdb_id)?.budget || pair.movieA.production_budget || 0
      const movieBBudget = enrichedMovieMap.get(pair.movieB.tmdb_id)?.budget || pair.movieB.production_budget || 0
      
      // Determine correct choice and budget difference
      const correct_choice = movieABudget > movieBBudget ? 'A' : 'B'
      const budget_difference = Math.abs(movieABudget - movieBBudget)

      return {
        round: pair.round,
        movieA: {
          tmdb_id: pair.movieA.tmdb_id,
          title: pair.movieA.title,
          poster_path: pair.movieA.poster_path,
          release_date: pair.movieA.release_date,
          budget: movieABudget,
          budget_source: enrichedMovieMap.get(pair.movieA.tmdb_id)?.budget_source || 'tmdb',
          is_estimated: enrichedMovieMap.get(pair.movieA.tmdb_id)?.is_estimated || false
        },
        movieB: {
          tmdb_id: pair.movieB.tmdb_id,
          title: pair.movieB.title,
          poster_path: pair.movieB.poster_path,
          release_date: pair.movieB.release_date,
          budget: movieBBudget,
          budget_source: enrichedMovieMap.get(pair.movieB.tmdb_id)?.budget_source || 'tmdb',
          is_estimated: enrichedMovieMap.get(pair.movieB.tmdb_id)?.is_estimated || false
        },
        correct_choice,
        budget_difference,
        difficulty_ratio: movieABudget > movieBBudget ? 
          movieABudget / movieBBudget : 
          movieBBudget / movieABudget
      }
    })

    // Sort rounds by round number
    allRoundsData.sort((a, b) => a.round - b.round)

    return NextResponse.json({
      all_rounds: allRoundsData
    })

  } catch (error) {
    console.error('Error in reveal-answers API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}