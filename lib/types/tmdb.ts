export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  adult: boolean
  genre_ids: number[]
  original_language: string
  original_title: string
  video: boolean
}

export interface TMDBSearchResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

export interface MovieSearchResult {
  id: number
  title: string
  overview: string
  posterUrl: string | null
  releaseYear: string
  rating: number
  voteCount: number
  director?: string | null
}

export interface MovieSearchResponse {
  results: MovieSearchResult[]
  totalResults: number
  page: number
  totalPages: number
}

export interface APIErrorResponse {
  error: string
}

// Extended movie details with budget and additional data
export interface TMDBMovieDetails extends TMDBMovie { 
  budget: number           // Production budget in USD
  revenue: number          // Box office revenue in USD
  runtime: number          // Runtime in minutes
  status: string           // "Released", "Post Production", etc.
  tagline: string          // Movie tagline
  homepage: string         // Official homepage URL
  imdb_id: string          // IMDB ID
  belongs_to_collection: {
    id: number
    name: string
    poster_path: string | null
    backdrop_path: string | null
  } | null
  production_companies: Array<{
    id: number
    name: string
    logo_path: string | null
    origin_country: string
  }>
  production_countries: Array<{
    iso_3166_1: string
    name: string
  }>
  spoken_languages: Array<{
    english_name: string
    iso_639_1: string
    name: string
  }>
  genres: Array<{
    id: number
    name: string
  }>
}

// Alternative titles response
export interface TMDBAlternativeTitles {
  id: number
  titles: Array<{
    iso_3166_1: string       // Country code
    title: string            // Alternative title
    type?: string            // Type of alternative title
  }>
}

// Enhanced movie for game use with budget and alternative titles
export interface EnrichedTMDBMovie extends TMDBMovie {
  budget?: number
  revenue?: number
  runtime?: number
  alternativeTitles?: TMDBAlternativeTitles
  budgetSource?: 'tmdb' | 'estimated' | 'unknown'
  is_trending?: boolean
}

// Cast and Credits interfaces
export interface TMDBCast {
  id: number
  name: string
  character: string
  credit_id: string
  order: number
  adult: boolean
  gender: number | null
  known_for_department: string
  original_name: string
  popularity: number
  profile_path: string | null
  cast_id: number
}

export interface TMDBCrew {
  id: number
  name: string
  job: string
  department: string
  credit_id: string
  adult: boolean
  gender: number | null
  known_for_department: string
  original_name: string
  popularity: number
  profile_path: string | null
}

export interface TMDBCreditsResponse {
  id: number
  cast: TMDBCast[]
  crew: TMDBCrew[]
}