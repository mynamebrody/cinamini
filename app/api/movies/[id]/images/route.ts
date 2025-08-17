import { NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: movieId } = await params

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      )
    }

    if (!movieId || isNaN(Number(movieId))) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      )
    }

    console.log(`Fetching images for movie ${movieId}`)

    // Fetch movie images from TMDB
    // Include only English posters using include_image_language parameter
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/images?include_image_language=en`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TMDB_API_KEY}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`TMDB images API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `TMDB API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract posters array from the response
    const posters = data.posters || []

    console.log(`Found ${posters.length} English posters for movie ${movieId}`)

    // Return just the posters array with useful metadata
    return NextResponse.json({
      movieId: Number(movieId),
      posters: posters.map((poster: any) => ({
        file_path: poster.file_path,
        aspect_ratio: poster.aspect_ratio,
        height: poster.height,
        width: poster.width,
        vote_average: poster.vote_average,
        vote_count: poster.vote_count,
        iso_639_1: poster.iso_639_1
      }))
    })

  } catch (error) {
    console.error('Error fetching movie images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movie images' },
      { status: 500 }
    )
  }
}