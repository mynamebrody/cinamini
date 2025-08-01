import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { hydrateMoviesFromTmdbIds, createUnifiedMoviePair, validateBudgetBracketMovie } from '@/lib/movie-hydration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pairs } = body
    
    if (!Array.isArray(pairs)) {
      return NextResponse.json(
        { error: "pairs must be an array" },
        { status: 400 }
      )
    }

    // Verify user is authenticated and is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log('=== ADMIN: Hydrating Budget Bracket pairs ===')
    
    // Extract all unique TMDB IDs from the pairs
    const tmdbIds = new Set<number>()
    pairs.forEach((pair: any) => {
      if (pair.movieA?.id) tmdbIds.add(pair.movieA.id)
      if (pair.movieB?.id) tmdbIds.add(pair.movieB.id)
    })

    console.log(`Extracting TMDB IDs: ${Array.from(tmdbIds).join(', ')}`)

    // Hydrate all movies from TMDB IDs
    const hydratedMovies = await hydrateMoviesFromTmdbIds(Array.from(tmdbIds))
    
    if (hydratedMovies.length === 0) {
      return NextResponse.json(
        { error: "Failed to hydrate any movies from provided IDs" },
        { status: 400 }
      )
    }

    // Create a lookup map for hydrated movies
    const movieMap = new Map()
    hydratedMovies.forEach(movie => {
      movieMap.set(movie.tmdb_id, movie)
    })

    // Generate hydrated pairs using the unified structure
    const hydratedPairs = []
    const validationErrors = []
    
    for (const pair of pairs) {
      const movieA = movieMap.get(pair.movieA?.id)
      const movieB = movieMap.get(pair.movieB?.id)
      
      if (!movieA || !movieB) {
        const error = `Round ${pair.round}: Missing movie data - ${!movieA ? `MovieA (ID: ${pair.movieA?.id})` : ''} ${!movieB ? `MovieB (ID: ${pair.movieB?.id})` : ''}`
        console.warn(error)
        validationErrors.push({
          round: pair.round,
          error: 'missing_movie_data',
          message: error,
          movieA_id: pair.movieA?.id,
          movieB_id: pair.movieB?.id
        })
        continue
      }

      // Check individual movie validation and collect detailed errors
      const movieAValid = validateBudgetBracketMovie(movieA)
      const movieBValid = validateBudgetBracketMovie(movieB)
      
      if (!movieAValid || !movieBValid) {
        const invalidMovies = []
        if (!movieAValid) {
          invalidMovies.push(`${movieA.title} ($${(movieA.production_budget || 0).toLocaleString()})`)
        }
        if (!movieBValid) {
          invalidMovies.push(`${movieB.title} ($${(movieB.production_budget || 0).toLocaleString()})`)
        }
        
        const error = `Round ${pair.round}: Movies don't meet $100 minimum budget requirement - ${invalidMovies.join(', ')}`
        console.warn(error)
        validationErrors.push({
          round: pair.round,
          error: 'insufficient_budget',
          message: error,
          movieA: {
            id: movieA.tmdb_id,
            title: movieA.title,
            budget: movieA.production_budget || 0,
            valid: movieAValid
          },
          movieB: {
            id: movieB.tmdb_id,
            title: movieB.title,
            budget: movieB.production_budget || 0,
            valid: movieBValid
          }
        })
        continue
      }

      // Create unified movie pair
      const unifiedPair = createUnifiedMoviePair(movieA, movieB, pair.round)
      hydratedPairs.push(unifiedPair)
    }

    // If there are validation errors, return them for user feedback
    if (validationErrors.length > 0) {
      // If ALL pairs failed validation, return an error
      if (hydratedPairs.length === 0) {
        return NextResponse.json({
          error: "No valid pairs could be created from provided movies",
          validationErrors,
          details: "All movie pairs failed validation requirements"
        }, { status: 400 })
      }
      
      // If only SOME pairs failed, return partial success with warnings
      return NextResponse.json({
        success: false,
        error: "Some movie pairs failed validation",
        hydratedPairs,
        validationErrors,
        stats: {
          originalPairsCount: pairs.length,
          hydratedPairsCount: hydratedPairs.length,
          failedPairsCount: validationErrors.length,
          totalMoviesHydrated: hydratedMovies.length,
          uniqueMovieIds: Array.from(tmdbIds)
        }
      }, { status: 400 })
    }

    console.log(`Successfully hydrated ${hydratedPairs.length} pairs`)

    return NextResponse.json({
      success: true,
      hydratedPairs,
      validationErrors: [], // Empty array when no errors
      stats: {
        originalPairsCount: pairs.length,
        hydratedPairsCount: hydratedPairs.length,
        failedPairsCount: 0,
        totalMoviesHydrated: hydratedMovies.length,
        uniqueMovieIds: Array.from(tmdbIds)
      }
    })

  } catch (error) {
    console.error('Error hydrating budget bracket pairs:', error)
    return NextResponse.json(
      { error: "Failed to hydrate pairs" },
      { status: 500 }
    )
  }
}