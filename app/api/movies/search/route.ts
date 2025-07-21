import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TMDBSearchResponse, MovieSearchResponse, APIErrorResponse } from '@/lib/types/tmdb'

// TMDB API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

export async function GET(request: NextRequest) {
  try {
    // Check if TMDB API key is configured
    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key is not configured' } as APIErrorResponse,
        { status: 500 }
      )
    }

    // Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' } as APIErrorResponse,
        { status: 401 }
      )
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const page = searchParams.get('page') || '1'

    // Validate search query
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' } as APIErrorResponse,
        { status: 400 }
      )
    }

    // Validate and sanitize query
    const sanitizedQuery = query.trim()
    if (sanitizedQuery.length > 100) {
      return NextResponse.json(
        { error: 'Search query is too long' } as APIErrorResponse,
        { status: 400 }
      )
    }

    // Make request to TMDB API
    const tmdbUrl = new URL(`${TMDB_BASE_URL}/search/movie`)
    tmdbUrl.searchParams.set('api_key', process.env.TMDB_API_KEY)
    tmdbUrl.searchParams.set('query', sanitizedQuery)
    tmdbUrl.searchParams.set('page', page)
    tmdbUrl.searchParams.set('include_adult', 'false')

    const tmdbResponse = await fetch(tmdbUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!tmdbResponse.ok) {
      console.error('TMDB API error:', tmdbResponse.status, tmdbResponse.statusText)
      return NextResponse.json(
        { error: 'Failed to search movies. Please try again.' } as APIErrorResponse,
        { status: 500 }
      )
    }

    const tmdbData: TMDBSearchResponse = await tmdbResponse.json()

    // Transform TMDB response to our format
    const searchResponse: MovieSearchResponse = {
      results: tmdbData.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview || 'No overview available.',
        posterUrl: movie.poster_path 
          ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` 
          : null,
        releaseYear: movie.release_date 
          ? new Date(movie.release_date).getFullYear().toString()
          : 'Unknown',
        rating: Math.round(movie.vote_average * 10) / 10, // Round to 1 decimal
        voteCount: movie.vote_count,
      })),
      totalResults: tmdbData.total_results,
      page: tmdbData.page,
      totalPages: tmdbData.total_pages,
    }

    return NextResponse.json(searchResponse)

  } catch (error) {
    console.error('Movie search error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' } as APIErrorResponse,
          { status: 408 }
        )
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' } as APIErrorResponse,
      { status: 500 }
    )
  }
}