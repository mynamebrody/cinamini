// Unified movie hydration utilities for consistent data structure across admin and auto generation
import { getMovieDetails } from './tmdb'
import type { BudgetBracketMovie } from './budget-bracket'

/**
 * Hydrate a movie from TMDB ID to full BudgetBracketMovie structure
 * This ensures consistent data structure between admin editor and auto generation
 */
export async function hydrateMovieFromTmdbId(tmdbId: number): Promise<BudgetBracketMovie | null> {
  try {
    console.log(`Hydrating movie from TMDB ID: ${tmdbId}`)
    
    // Fetch detailed movie information from TMDB
    const movieDetails = await getMovieDetails(tmdbId)
    
    if (!movieDetails) {
      console.error(`Failed to fetch movie details for TMDB ID: ${tmdbId}`)
      return null
    }

    // Validate required fields
    if (!movieDetails.budget || movieDetails.budget <= 0) {
      console.warn(`Movie ${movieDetails.title} (${tmdbId}) has no budget data`)
      return null
    }

    if (!movieDetails.release_date || movieDetails.release_date.trim() === '') {
      console.warn(`Movie ${movieDetails.title} (${tmdbId}) has no release date`)
      return null
    }

    // Create unified BudgetBracketMovie structure
    const hydratedMovie: BudgetBracketMovie = {
      // Core identification
      id: movieDetails.id,
      tmdb_id: movieDetails.id,
      title: movieDetails.title,
      
      // Budget information
      production_budget: movieDetails.budget,
      budget_source: 'tmdb',
      is_budget_estimated: false,
      
      // Visual assets
      poster_path: movieDetails.poster_path,
      
      // Release information
      release_date: movieDetails.release_date,
      
      // Popularity metrics
      popularity_score: movieDetails.popularity || 0,
      
      // Seeding properties (required by SeedableGameItem interface)
      seedValue: movieDetails.id.toString(),
      gameRelevanceScore: (movieDetails.popularity || 0) / 100
    }

    console.log(`Successfully hydrated movie: ${hydratedMovie.title}`)
    return hydratedMovie

  } catch (error) {
    console.error(`Error hydrating movie ${tmdbId}:`, error)
    return null
  }
}

/**
 * Hydrate multiple movies from TMDB IDs in parallel
 * Includes rate limiting to respect TMDB API limits
 */
export async function hydrateMoviesFromTmdbIds(tmdbIds: number[]): Promise<BudgetBracketMovie[]> {
  const batchSize = 10 // Process in batches to manage rate limiting
  const hydratedMovies: BudgetBracketMovie[] = []
  
  console.log(`Hydrating ${tmdbIds.length} movies in batches of ${batchSize}`)
  
  for (let i = 0; i < tmdbIds.length; i += batchSize) {
    const batch = tmdbIds.slice(i, i + batchSize)
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(tmdbId => hydrateMovieFromTmdbId(tmdbId))
    )
    
    // Filter out null results and add to collection
    const validMovies = batchResults.filter((movie): movie is BudgetBracketMovie => movie !== null)
    hydratedMovies.push(...validMovies)
    
    // Wait between batches to respect rate limits (40 requests per 10 seconds)
    if (i + batchSize < tmdbIds.length) {
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, waiting 3 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
  
  console.log(`Successfully hydrated ${hydratedMovies.length} out of ${tmdbIds.length} movies`)
  return hydratedMovies
}

/**
 * Validate that a movie meets Budget Bracket requirements
 * This ensures consistency across all puzzle generation methods
 */
export function validateBudgetBracketMovie(movie: any): movie is BudgetBracketMovie {
  const requiredFields = [
    'id', 'tmdb_id', 'title', 'production_budget', 'budget_source', 
    'is_budget_estimated', 'poster_path', 'release_date', 'popularity_score'
  ]
  
  // Check all required fields exist
  for (const field of requiredFields) {
    if (!(field in movie)) {
      console.warn(`Movie validation failed: missing field '${field}'`)
      return false
    }
  }
  
  // Validate budget requirements
  if (typeof movie.production_budget !== 'number' || movie.production_budget < 100) {
    console.warn(`Movie validation failed: insufficient budget (${movie.production_budget})`)
    return false
  }
  
  // Validate release date
  if (!movie.release_date || typeof movie.release_date !== 'string' || movie.release_date.trim() === '') {
    console.warn(`Movie validation failed: invalid release date (${movie.release_date})`)
    return false
  }
  
  // Validate release year is reasonable
  const releaseYear = new Date(movie.release_date).getFullYear()
  if (isNaN(releaseYear) || releaseYear < 1900 || releaseYear > new Date().getFullYear() + 10) {
    console.warn(`Movie validation failed: invalid release year (${releaseYear})`)
    return false
  }
  
  return true
}

/**
 * Create a movie pair with unified structure
 * Used by both admin editor and automatic generation
 */
export interface UnifiedMoviePair {
  round: number
  movieA: BudgetBracketMovie
  movieB: BudgetBracketMovie
  correctChoice: 'A' | 'B'
  budgetDifference: number
  difficultyRatio: number
}

/**
 * Create a unified movie pair from two hydrated movies
 */
export function createUnifiedMoviePair(
  movieA: BudgetBracketMovie, 
  movieB: BudgetBracketMovie, 
  round: number
): UnifiedMoviePair {
  const correctChoice = movieA.production_budget > movieB.production_budget ? 'A' : 'B'
  const budgetDifference = Math.abs(movieA.production_budget - movieB.production_budget)
  
  // Calculate difficulty ratio (higher budget / lower budget)
  const higher = Math.max(movieA.production_budget, movieB.production_budget)
  const lower = Math.min(movieA.production_budget, movieB.production_budget)
  const difficultyRatio = lower > 0 ? higher / lower : 1
  
  return {
    round,
    movieA,
    movieB,
    correctChoice,
    budgetDifference,
    difficultyRatio
  }
}