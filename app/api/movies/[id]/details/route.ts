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

    // Add timeout for better reliability
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits`,
      { 
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TMDB_API_KEY}`,
        },
        signal: controller.signal,
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch movie details" },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Extract director and writer from credits
    const director = data.credits?.crew?.find((member: any) => 
      member.job === "Director"
    )?.name || null

    const writer = data.credits?.crew?.find((member: any) => 
      member.job === "Writer" || member.job === "Screenplay" || member.job === "Story"
    )?.name || null

    // Extract main cast (top 5 billed actors)
    const mainCast = data.credits?.cast?.slice(0, 5).map((actor: any) => ({
      name: actor.name,
      character: actor.character,
      order: actor.order
    })) || []

    // Extract production companies
    const productionCompanies = data.production_companies?.map((company: any) => ({
      id: company.id,
      name: company.name,
      logo_path: company.logo_path,
      origin_country: company.origin_country
    })) || []

    // Return enhanced movie details
    return NextResponse.json({
      id: data.id,
      title: data.title,
      poster_path: data.poster_path,
      release_date: data.release_date,
      budget: data.budget || 0,
      revenue: data.revenue || 0,
      runtime: data.runtime || 0,
      vote_average: data.vote_average || 0,
      director,
      writer,
      overview: data.overview,
      genres: data.genres || [],
      tagline: data.tagline || null,
      status: data.status || null,
      production_companies: productionCompanies,
      main_cast: mainCast,
      credits: data.credits
    })
  } catch (error) {
    console.error("Error fetching movie details:", error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: "Request timeout. Please try again." },
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}