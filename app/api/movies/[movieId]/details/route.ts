import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(
  request: NextRequest,
  { params }: { params: { movieId: string } }
) {
  const movieId = params.movieId

  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Fetch movie details with credits
    const [movieResponse, creditsResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`,
        {
          headers: {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'accept': 'application/json'
          }
        }
      ),
      fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/credits?language=en-US`,
        {
          headers: {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'accept': 'application/json'
          }
        }
      )
    ])

    if (!movieResponse.ok || !creditsResponse.ok) {
      throw new Error('Failed to fetch movie data')
    }

    const movieData = await movieResponse.json()
    const creditsData = await creditsResponse.json()

    // Combine the data
    const detailedMovie = {
      ...movieData,
      credits: {
        cast: creditsData.cast || [],
        crew: creditsData.crew || []
      }
    }

    return NextResponse.json(detailedMovie)
  } catch (error) {
    console.error('Error fetching movie details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 }
    )
  }
}