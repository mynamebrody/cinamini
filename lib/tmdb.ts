// TMDB API utility functions
import { TMDBMovie, TMDBMovieDetails, TMDBAlternativeTitles, TMDBCreditsResponse, TMDBCast, TMDBCrew } from './types/tmdb'

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

// Re-export TMDBMovie interface for backward compatibility

export async function getMovieById(movieId: number): Promise<TMDBMovie | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured, using fallback data')
    return getFallbackMovieData(movieId)
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`,
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
    return data
  } catch (error) {
    console.error(`Error fetching movie ${movieId} from TMDB:`, error)
    return getFallbackMovieData(movieId)
  }
}

export async function getMultipleMovies(movieIds: number[]): Promise<TMDBMovie[]> {
  const promises = movieIds.map(id => getMovieById(id))
  const results = await Promise.all(promises)
  return results.filter((movie): movie is TMDBMovie => movie !== null)
}

// Fallback data based on actual TMDB IDs
function getFallbackMovieData(movieId: number): TMDBMovie | null {
  const fallbackData: Record<number, TMDBMovie> = {
    562: {
      id: 562,
      title: "Die Hard",
      original_title: "Die Hard",
      release_date: "1988-07-22",
      overview: "NYPD cop John McClane's plan to reconcile with his estranged wife is thrown for a serious loop when, minutes after he arrives at her office, the entire building is overtaken by a group of terrorists.",
      poster_path: "/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg",
      backdrop_path: "/1Cy5U5JWGpAHauR7nEQH8iO3vxm.jpg",
      vote_average: 7.8,
      vote_count: 9500,
      popularity: 45.0,
      adult: false,
      genre_ids: [28, 53],
      original_language: "en",
      video: false
    },
    679: {
      id: 679,
      title: "Aliens",
      original_title: "Aliens", 
      release_date: "1986-07-18",
      overview: "When Ripley's lifepod is found by a salvage crew over 50 years later, she finds that terra-formers are on the very planet they found the alien species.",
      poster_path: "/r1x5JGpyqZU8PYhbs4UcrZz8TBn.jpg",
      backdrop_path: "/pcq0brjDzuEF7lGb7qzSsJyNL6K.jpg",
      vote_average: 8.4,
      vote_count: 12000,
      popularity: 67.0,
      adult: false,
      genre_ids: [878, 28, 53],
      original_language: "en",
      video: false
    },
    78: {
      id: 78,
      title: "Blade Runner",
      original_title: "Blade Runner",
      release_date: "1982-06-25",
      overview: "In the smog-choked dystopian Los Angeles of 2019, blade runner Rick Deckard is called out of retirement to terminate a quartet of replicants who have escaped to Earth seeking their creator for a way to extend their short life spans.",
      poster_path: "/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg",
      backdrop_path: "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg",
      vote_average: 8.2,
      vote_count: 13000,
      popularity: 72.0,
      adult: false,
      genre_ids: [878, 18],
      original_language: "en",
      video: false
    },
    218: {
      id: 218,
      title: "The Terminator",
      original_title: "The Terminator",
      release_date: "1984-10-26", 
      overview: "In the post-apocalyptic future, reigning tyrannical supercomputers teleport a cyborg assassin known as the 'Terminator' back to 1984 to kill Sarah Connor, whose unborn son is destined to lead insurgents against 21st century mechanical hegemony.",
      poster_path: "/qvktm0BHcnmDpul4Hz01GIazWPr.jpg",
      backdrop_path: "/5M0j0B18abtBI5gi2RhfjjurTqb.jpg",
      vote_average: 7.7,
      vote_count: 11000,
      popularity: 58.0,
      adult: false,
      genre_ids: [28, 878, 53],
      original_language: "en",
      video: false
    }
  }

  return fallbackData[movieId] || null
}

export function getReleaseYear(releaseDate: string): string {
  return new Date(releaseDate).getFullYear().toString()
}

/**
 * Get movie translations from TMDB API
 */
export async function getMovieTranslations(movieId: number): Promise<any | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/translations`,
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
    return data
  } catch (error) {
    console.error(`Error fetching translations for movie ${movieId}:`, error)
    return null
  }
}

/**
 * Check if TMDB API is configured
 */
export function isTMDBConfigured(): boolean {
  return Boolean(TMDB_API_KEY && TMDB_API_KEY.length > 0)
}

/**
 * Get TMDB configuration (base URLs for images, etc.)
 */
export async function getTMDBConfiguration(): Promise<any | null> {
  if (!TMDB_API_KEY) {
    return null
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/configuration`,
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
    return data
  } catch (error) {
    console.error('Error fetching TMDB configuration:', error)
    return null
  }
}

/**
 * Build poster URL with fallback
 */
export function getPosterUrl(posterPath: string | null, size: string = 'w500'): string | null {
  if (!posterPath) return null
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}

/**
 * Build backdrop URL with fallback
 */
export function getBackdropUrl(backdropPath: string | null, size: string = 'w1280'): string | null {
  if (!backdropPath) return null
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`
}

/**
 * Get trending movies from TMDB API
 */
export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'day'): Promise<TMDBMovie[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured, returning empty trending list')
    return []
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}?language=en-US`,
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
    return data.results || []
  } catch (error) {
    console.error(`Error fetching trending movies (${timeWindow}):`, error)
    return []
  }
}

/**
 * Get popular movies as a fallback for trending
 */
export async function getPopularMovies(page: number = 1): Promise<TMDBMovie[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured, returning empty popular list')
    return []
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?language=en-US&page=${page}`,
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
    return data.results || []
  } catch (error) {
    console.error(`Error fetching popular movies (page ${page}):`, error)
    return []
  }
}

/**
 * Get detailed movie information including budget from TMDB API
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovieDetails | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`,
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
    return data as TMDBMovieDetails
  } catch (error) {
    console.error(`Error fetching movie details for ${movieId}:`, error)
    return null
  }
}

/**
 * Get alternative titles for a movie from TMDB API
 */
export async function getMovieAlternativeTitles(movieId: number): Promise<TMDBAlternativeTitles | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/alternative_titles`,
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
    return data as TMDBAlternativeTitles
  } catch (error) {
    console.error(`Error fetching alternative titles for movie ${movieId}:`, error)
    return null
  }
}

/**
 * Enrich a movie with detailed budget and alternative title data
 */
export async function enrichMovieWithDetails(movie: TMDBMovie): Promise<any> {
  const [details, altTitles] = await Promise.all([
    getMovieDetails(movie.id),
    getMovieAlternativeTitles(movie.id)
  ])

  return {
    ...movie,
    budget: details?.budget || 0,
    revenue: details?.revenue || 0,
    runtime: details?.runtime || 0,
    // Preserve release_date from original movie data, but use detailed version if available
    release_date: details?.release_date || movie.release_date,
    alternativeTitles: altTitles,
    budgetSource: details?.budget && details.budget > 0 ? 'tmdb' : 'unknown'
  }
}

/**
 * Batch enrich multiple movies with detailed data
 * Includes rate limiting to respect TMDB's 40 requests/10 seconds limit
 */
export async function enrichMoviesWithDetails(movies: TMDBMovie[]): Promise<any[]> {
  const enrichedMovies = []
  const batchSize = 10 // Process in batches to manage rate limiting
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize)
    const enrichedBatch = await Promise.all(
      batch.map(movie => enrichMovieWithDetails(movie))
    )
    enrichedMovies.push(...enrichedBatch)
    
    // Wait 3 seconds between batches to respect rate limits
    if (i + batchSize < movies.length) {
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
  
  return enrichedMovies
}

/**
 * Search for movies on TMDB
 */
export async function searchMovies(query: string, page: number = 1): Promise<TMDBMovie[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured')
    return []
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=${page}`,
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
    return data.results || []
  } catch (error) {
    console.error(`Error searching movies with query "${query}":`, error)
    return []
  }
}

/**
 * Get movie cast and crew credits from TMDB API
 */
export async function getMovieCredits(movieId: number): Promise<TMDBCreditsResponse | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/credits`,
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
    return data as TMDBCreditsResponse
  } catch (error) {
    console.error(`Error fetching credits for movie ${movieId}:`, error)
    return null
  }
}

// Re-export the TMDB types for convenience
export type { TMDBMovie, TMDBMovieDetails, TMDBAlternativeTitles, TMDBCreditsResponse, TMDBCast, TMDBCrew } 