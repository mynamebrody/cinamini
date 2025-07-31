import { NextRequest, NextResponse } from "next/server"

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

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/alternative_titles`,
      { 
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TMDB_API_KEY}`,
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch alternative titles" },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching alternative titles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}