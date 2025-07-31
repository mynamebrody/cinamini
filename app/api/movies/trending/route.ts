import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const timeWindow = searchParams.get('time_window') || 'week'
  const page = searchParams.get('page') || '1'

  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 500 }
    )
  }

  const supabase = await createClient()

  // Check cache first
  const { data: cachedData } = await supabase
    .from('tmdb_trending_cache')
    .select('*')
    .eq('time_window', timeWindow)
    .gte('expires_at', new Date().toISOString())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (cachedData) {
    return NextResponse.json({
      results: cachedData.movies_data,
      page: cachedData.page_fetched,
      total_results: cachedData.total_results,
      from_cache: true
    })
  }

  try {
    // Fetch from TMDB API
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}?page=${page}`,
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

    // Cache the results
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Cache for 24 hours

    await supabase
      .from('tmdb_trending_cache')
      .insert({
        time_window: timeWindow,
        movies_data: data.results,
        expires_at: expiresAt.toISOString(),
        total_results: data.total_results,
        page_fetched: parseInt(page),
        cache_version: 1
      })

    return NextResponse.json({
      results: data.results,
      page: data.page,
      total_results: data.total_results,
      from_cache: false
    })
  } catch (error) {
    console.error('Error fetching trending movies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending movies' },
      { status: 500 }
    )
  }
}