import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: movieId } = await params

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: "TMDB API key not configured" },
        { status: 500 }
      )
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'

    // Fetch similar movies from TMDB
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/similar?page=${page}`,
      { 
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TMDB_API_KEY}`,
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Movie not found" },
          { status: 404 }
        )
      }
      
      console.error(`TMDB API error: ${response.status}`)
      return NextResponse.json(
        { error: "Failed to fetch similar movies" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Return formatted response consistent with trending endpoint
    return NextResponse.json({
      results: data.results || [],
      page: data.page || 1,
      total_results: data.total_results || 0,
      total_pages: data.total_pages || 1,
      movie_id: movieId
    })

  } catch (error) {
    console.error("Error fetching similar movies:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}