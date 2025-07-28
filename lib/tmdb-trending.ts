/**
 * TMDB Trending Movies Cache System
 * 
 * This module handles caching of TMDB trending movies data to reduce API calls
 * and provide better game performance with fresh movie selections.
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTrendingMovies, getPopularMovies, type TMDBMovie } from './tmdb'

export interface TrendingCacheEntry {
  id: string
  time_window: 'day' | 'week'
  movies_data: TMDBMovie[]
  fetched_at: string
  expires_at: string
  created_at: string
}

/**
 * Get cached trending movies with automatic refresh
 */
export async function getCachedTrendingMovies(
  timeWindow: 'day' | 'week' = 'day'
): Promise<TMDBMovie[]> {
  try {
    const supabase = await createClient()
    const cacheId = `trending-${timeWindow}`
    
    // Try to get cached data first
    const { data: cached, error } = await supabase
      .from('tmdb_trending_cache')
      .select('*')
      .eq('id', cacheId)
      .eq('time_window', timeWindow)
      .single()

    // Check if cache is still valid
    if (cached && !error) {
      const expiresAt = new Date(cached.expires_at)
      const now = new Date()
      
      if (now < expiresAt) {
        console.log(`Using cached trending movies (${timeWindow})`)
        return cached.movies_data as TMDBMovie[]
      }
    }

    // Cache expired or doesn't exist, fetch fresh data
    console.log(`Fetching fresh trending movies (${timeWindow})`)
    const trendingMovies = await getTrendingMovies(timeWindow)
    
    if (trendingMovies.length === 0) {
      // Fallback to popular movies if trending fails
      console.log('Trending API failed, falling back to popular movies')
      const popularMovies = await getPopularMovies(1)
      if (popularMovies.length > 0) {
        await cacheTrendingMovies(popularMovies, timeWindow)
        return popularMovies
      }
      
      // Return cached data even if expired, better than nothing
      if (cached && cached.movies_data) {
        console.log('Using expired cache as final fallback')
        return cached.movies_data as TMDBMovie[]
      }
      
      return []
    }

    // Cache the fresh data
    await cacheTrendingMovies(trendingMovies, timeWindow)
    return trendingMovies

  } catch (error) {
    console.error('Error in getCachedTrendingMovies:', error)
    
    // Final fallback: return hardcoded popular movies
    return getHardcodedPopularMovies()
  }
}

/**
 * Cache trending movies data in the database using service role
 */
async function cacheTrendingMovies(
  movies: TMDBMovie[], 
  timeWindow: 'day' | 'week'
): Promise<void> {
  try {
    // Use service role client to bypass RLS for system operations
    const supabase = createServiceClient()
    const cacheId = `trending-${timeWindow}`
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const cacheEntry = {
      id: cacheId,
      time_window: timeWindow,
      movies_data: movies,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    }

    // Upsert the cache entry using service role (bypasses RLS)
    const { error } = await supabase
      .from('tmdb_trending_cache')
      .upsert(cacheEntry, { onConflict: 'id' })

    if (error) {
      console.error('Error caching trending movies:', error)
    } else {
      console.log(`Successfully cached ${movies.length} trending movies (${timeWindow})`)
    }
  } catch (error) {
    console.error('Error in cacheTrendingMovies:', error)
    // Don't throw - caching is optional, games should still work without it
  }
}

/**
 * Get a mix of trending and classic movies with weighted selection
 */
export async function getBlendedMoviePool(
  trendingWeight: number = 0.3,
  minMovies: number = 50
): Promise<TMDBMovie[]> {
  try {
    // Get trending movies
    const trendingMovies = await getCachedTrendingMovies('day')
    const weeklyTrending = await getCachedTrendingMovies('week')
    
    // Combine and deduplicate trending movies
    const allTrending = [...trendingMovies, ...weeklyTrending]
    const uniqueTrending = Array.from(
      new Map(allTrending.map(movie => [movie.id, movie])).values()
    )

    // Get popular movies as baseline
    const popularMovies = await getPopularMovies(1)
    const popularMovies2 = await getPopularMovies(2)
    const classicMovies = [...popularMovies, ...popularMovies2]

    // Remove trending movies from classics to avoid duplicates
    const trendingIds = new Set(uniqueTrending.map(m => m.id))
    const filteredClassics = classicMovies.filter(m => !trendingIds.has(m.id))

    // Calculate how many of each type to include
    const targetTrendingCount = Math.floor(minMovies * trendingWeight)
    const targetClassicCount = minMovies - targetTrendingCount

    // Select movies
    const selectedTrending = uniqueTrending.slice(0, targetTrendingCount)
    const selectedClassics = filteredClassics.slice(0, targetClassicCount)

    // Mark trending movies for identification
    const markedTrending = selectedTrending.map(movie => ({
      ...movie,
      is_trending: true
    }))

    const markedClassics = selectedClassics.map(movie => ({
      ...movie,
      is_trending: false
    }))

    const blendedPool = [...markedTrending, ...markedClassics]
    
    console.log(`Created blended movie pool: ${selectedTrending.length} trending + ${selectedClassics.length} classic = ${blendedPool.length} total`)
    
    return blendedPool

  } catch (error) {
    console.error('Error creating blended movie pool:', error)
    // Fallback to hardcoded movies
    return getHardcodedPopularMovies()
  }
}

/**
 * Hardcoded popular movies as final fallback
 */
function getHardcodedPopularMovies(): TMDBMovie[] {
  return [
    {
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
    {
      id: 155,
      title: "The Dark Knight",
      original_title: "The Dark Knight", 
      release_date: "2008-07-18",
      overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.",
      poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      backdrop_path: "/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg",
      vote_average: 8.5,
      vote_count: 31000,
      popularity: 123.0,
      adult: false,
      genre_ids: [18, 28, 80, 53],
      original_language: "en",
      video: false
    },
    {
      id: 13,
      title: "Forrest Gump",
      original_title: "Forrest Gump",
      release_date: "1994-06-23",
      overview: "A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do.",
      poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
      backdrop_path: "/7c9UVPPiTPltouxRVY6N9uGaGdR.jpg",
      vote_average: 8.5,
      vote_count: 25000,
      popularity: 89.0,
      adult: false,
      genre_ids: [35, 18, 10749],
      original_language: "en",
      video: false
    }
  ]
}

/**
 * Clear expired entries from the trending cache using service role
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    // Use service role client for cleanup operations
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('tmdb_trending_cache')
      .delete()
      .lt('expires_at', now)

    if (error) {
      console.error('Error cleaning up expired cache:', error)
    } else {
      console.log('Successfully cleaned up expired trending cache entries')
    }
  } catch (error) {
    console.error('Error in cleanupExpiredCache:', error)
    // Don't throw - cleanup is optional
  }
}