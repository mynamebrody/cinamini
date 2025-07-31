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
      console.error('TMDB_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'TMDB API key is not configured' } as APIErrorResponse,
        { status: 500 }
      )
    }

    // Log API key presence for debugging (without revealing the key)
    console.log('TMDB API Key configured:', process.env.TMDB_API_KEY ? 'Yes' : 'No')
    console.log('TMDB API Key length:', process.env.TMDB_API_KEY?.length || 0)

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

    // Make request to TMDB API using Bearer token authentication
    const tmdbUrl = new URL(`${TMDB_BASE_URL}/search/movie`)
    tmdbUrl.searchParams.set('query', sanitizedQuery)
    tmdbUrl.searchParams.set('page', page)
    tmdbUrl.searchParams.set('include_adult', 'false')

    console.log('Making TMDB request to:', tmdbUrl.toString())

    const tmdbResponse = await fetch(tmdbUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.TMDB_API_KEY}`,
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    console.log('TMDB Response Status:', tmdbResponse.status, tmdbResponse.statusText)

    if (!tmdbResponse.ok) {
      const errorText = await tmdbResponse.text()
      console.error('TMDB API error details:', errorText)
      console.error('TMDB API error:', tmdbResponse.status, tmdbResponse.statusText)
      
      // If 401, it's likely an API key issue
      if (tmdbResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid TMDB API key. Please check your configuration.' } as APIErrorResponse,
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to search movies. Please try again.' } as APIErrorResponse,
        { status: 500 }
      )
    }

    const tmdbData: TMDBSearchResponse = await tmdbResponse.json()

    // Transform TMDB response to match the MovieSearchResult interface
    const searchResponse: MovieSearchResponse = {
      results: tmdbData.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview || 'No overview available.',
        posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
        releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : 'Unknown',
        rating: movie.vote_average,
        voteCount: movie.vote_count
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