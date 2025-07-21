import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get search query from URL parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Check if TMDB API key is configured
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      )
    }

    // Make request to TMDB API
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    
    const response = await fetch(tmdbUrl)
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Transform the data to only include what we need and ensure security
    const transformedResults = data.results?.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      release_date: movie.release_date,
      overview: movie.overview,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count
    })) || []

    return NextResponse.json({
      results: transformedResults,
      total_results: data.total_results,
      total_pages: data.total_pages
    })

  } catch (error) {
    console.error('Movie search error:', error)
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    )
  }
}