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