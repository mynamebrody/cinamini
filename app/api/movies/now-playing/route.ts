import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const LIST_TYPE = 'now_playing'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = searchParams.get('page') || '1'

  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 500 }
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

  const serviceSupabase = await createServiceClient()

  // Check cache first
  const { data: cachedData } = await serviceSupabase
    .from('tmdb_movie_lists_cache')
    .select('*')
    .eq('list_type', LIST_TYPE)
    .gte('expires_at', new Date().toISOString())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (cachedData) {
    return NextResponse.json({
      results: cachedData.movies_data,
      page: cachedData.page,
      total_results: cachedData.total_results,
      from_cache: true
    })
  }

  try {
    // Fetch from TMDB API
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/now_playing?page=${page}&region=US`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()

    // Fetch detailed movie info for the first 20 movies
    const detailPromises = data.results.slice(0, 20).map(async (movie: any, index: number) => {
      try {
        // Add delay between requests to avoid rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * 50))
        }
        
        const detailsResponse = await fetch(`${TMDB_BASE_URL}/movie/${movie.id}?append_to_response=credits`, {
          headers: {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'accept': 'application/json'
          }
        })
        
        if (detailsResponse.ok) {
          const details = await detailsResponse.json()
          
          // Extract director
          const director = details.credits?.crew?.find((member: any) => 
            member.job === "Director"
          )?.name || null

          return {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            overview: movie.overview,
            budget: details.budget,
            revenue: details.revenue,
            vote_average: movie.vote_average,
            runtime: details.runtime,
            director: director,
            genres: details.genres,
            tagline: details.tagline,
            status: details.status
          }
        } else {
          // Return basic movie data if details fetch fails
          return {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            overview: movie.overview,
            vote_average: movie.vote_average
          }
        }
      } catch (error) {
        console.warn(`Error fetching details for movie ${movie.id}:`, error)
        // Return basic movie data if there's an error
        return {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          overview: movie.overview,
          vote_average: movie.vote_average
        }
      }
    })

    const moviesWithDetails = await Promise.all(detailPromises)

    // Cache the results
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Cache for 24 hours

    await serviceSupabase
      .from('tmdb_movie_lists_cache')
      .insert({
        list_type: LIST_TYPE,
        movies_data: moviesWithDetails,
        expires_at: expiresAt.toISOString(),
        total_results: data.total_results,
        page: parseInt(page),
        cache_version: '1.0'
      })

    return NextResponse.json({
      results: moviesWithDetails,
      page: data.page,
      total_results: data.total_results,
      from_cache: false
    })
  } catch (error) {
    console.error('Error fetching now playing movies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch now playing movies' },
      { status: 500 }
    )
  }
}