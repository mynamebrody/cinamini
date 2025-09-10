// OpenAI service for smart puzzle generation with web search
import { TMDBMovie, TMDBMovieDetails } from './types/tmdb'
import { getMovieById, getMovieAlternativeTitles, getMovieCredits, searchMovies } from './tmdb'
import { openai } from './openai-client'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
// gpt-5 family by default; allow override via OPENAI_MODEL for specific gpt-5 variants
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5'

export interface GenerationConfig {
  obscurityThreshold?: number // 1-10, where 1 is mainstream and 10 is very obscure
  budgetClosenessThreshold?: number // Percentage difference allowed (e.g., 0.3 = 30%)
  avoidRecentDays?: number // Days to look back for any game type (default 30)
  avoidSameGameDays?: number // Days to look back for same game type (default 365)
}

export interface SmartPuzzleRequest {
  gameType: 'retitled' | 'budget-bracket' | 'cast-climb' | 'poster-pixels'
  targetDate: string
  config?: GenerationConfig
}

export interface SmartPuzzleResponse {
  success: boolean
  puzzle?: any // Game-specific puzzle data
  error?: string
  suggestions?: TMDBMovie[] // Alternative movie suggestions if generation fails
}

// Default configuration
const DEFAULT_CONFIG: GenerationConfig = {
  obscurityThreshold: 5, // Medium difficulty
  budgetClosenessThreshold: 0.3, // 30% difference
  avoidRecentDays: 30,
  avoidSameGameDays: 365
}

// Validate movie against obscurity criteria
function isMovieAppropriate(movie: TMDBMovieDetails, config: GenerationConfig): boolean {
  const threshold = config.obscurityThreshold || DEFAULT_CONFIG.obscurityThreshold!
  
  // Use vote count as a proxy for obscurity (more votes = less obscure)
  // Normalize to 1-10 scale
  const obscurityScore = Math.min(10, Math.max(1, 10 - Math.log10(movie.vote_count || 1)))
  
  // Check if movie meets criteria
  if (obscurityScore > threshold) {
    return false // Too obscure
  }
  
  // Additional checks
  if (!movie.poster_path) {
    return false // No poster available
  }
  
  if (movie.adult) {
    return false // Adult content
  }
  
  if (movie.release_date) {
    const releaseYear = new Date(movie.release_date).getFullYear()
    const currentYear = new Date().getFullYear()
    
    // Too old (before 1960) or unreleased
    if (releaseYear < 1960 || releaseYear > currentYear) {
      return false
    }
  }
  
  return true
}

// Query OpenAI for movie suggestions using the Responses API with web_search
async function queryOpenAIForMovies(
  gameType: string,
  prompt: string
): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  try {
    const response = await openai.responses.create({
      model: OPENAI_MODEL, // gpt-5 family
      tools: [ { type: 'web_search' } ],
      input: [
        {
          role: 'system',
          content: `You are a movie puzzle generator assistant for the "${gameType}" game. \
Return STRICT JSON with a top-level key \"movie_ids\" containing an array of TMDB numeric IDs. \
No prose. Example: {"movie_ids":[550,680,155]}`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    } as any)

    let content: string = (response as any)?.output_text || '{}'
    if (content.startsWith('```')) {
      content = content.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '')
    }
    const parsed = JSON.parse(content)
    const raw = parsed.movie_ids || parsed.movies || parsed.ids || []
    if (!Array.isArray(raw)) {
      throw new Error('Invalid response format from OpenAI (responses)')
    }
    // Resolve to numeric TMDB IDs; accept numbers, numeric strings, or {title, year} objects
    const ids: number[] = []
    for (const item of raw) {
      if (typeof item === 'number' && Number.isFinite(item)) {
        ids.push(item)
      } else if (typeof item === 'string') {
        const asNum = Number(item)
        if (Number.isFinite(asNum)) {
          ids.push(asNum)
        } else {
          // Treat as title; search TMDB
          const results = await searchMovies(item)
          if (results && results.length > 0) ids.push(results[0].id)
        }
      } else if (item && typeof item === 'object') {
        const title = (item.title || item.name || '').toString()
        const year = item.year ? String(item.year) : ''
        if (title) {
          const q = year ? `${title} ${year}` : title
          const results = await searchMovies(q)
          if (results && results.length > 0) ids.push(results[0].id)
        }
      }
    }
    return Array.from(new Set(ids))
  } catch (error) {
    console.error('Error querying OpenAI (responses):', error)
    throw error
  }
}

// Generate puzzle for Retitled game
async function generateRetitledPuzzle(
  targetDate: string,
  config: GenerationConfig,
  recentMovieIds: number[]
): Promise<any> {
  // Query OpenAI for a movie with good international titles
  const prompt = `Find a popular movie that has interesting or amusing international titles.
  The movie should be well-known but have a foreign title that makes it challenging to guess.
  Avoid these recent movie IDs: ${recentMovieIds.join(', ')}.
  Suggest 5 potential movies and return their TMDB IDs.`
  
  const suggestedIds = await queryOpenAIForMovies('retitled', prompt)
  
  // Validate and select the best movie
  for (const movieId of suggestedIds) {
    const movie = await getMovieById(movieId) as TMDBMovieDetails
    if (!movie || !isMovieAppropriate(movie, config)) continue
    
    // Get alternative titles
    let altTitles = await getMovieAlternativeTitles(movieId)
    // Fallback: ask OpenAI (with web search) for a localized title if TMDB translations are unavailable
    if (!altTitles || !Array.isArray(altTitles.titles) || altTitles.titles.length === 0) {
      try {
        const resp = await openai.responses.create({
          model: OPENAI_MODEL,
          tools: [{ type: 'web_search' }],
          input: [{
            role: 'user',
            content: `For the film "${movie.title}" (${movie.release_date?.slice(0,4) || ''}), list one non-US localized title with its ISO 3166-1 country code. Return JSON: {"title": string, "iso_3166_1": string}.`
          }]
        } as any)
        let txt: string = (resp as any)?.output_text || '{}'
        if (txt.startsWith('```')) txt = txt.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '')
        const parsed = JSON.parse(txt)
        if (parsed && parsed.title && parsed.iso_3166_1) {
          altTitles = { id: movieId, titles: [{ iso_3166_1: parsed.iso_3166_1, title: parsed.title, type: 'translation' }] } as any
        }
      } catch (e) {
        // ignore and continue to next suggestion
      }
    }
    
    // Find interesting foreign title
    const interestingTitles = (altTitles?.titles || []).filter((t: any) => 
      t.iso_3166_1 !== 'US' && 
      t.title !== movie.title &&
      t.title.length > 3
    )
    
    if (interestingTitles.length === 0) continue
    
    // Select a random foreign title
    const selectedTitle = interestingTitles[Math.floor(Math.random() * interestingTitles.length)]
    
    // Get distractor movies (similar genre/era)
    const distractorPrompt = `Find 4 movies similar to "${movie.title}" (${movie.release_date?.substring(0, 4)}) 
    that could be plausible wrong answers. They should be from similar genres and time periods.
    Return TMDB IDs or exact titles if unknown.`
    
    const distractorIds = await queryOpenAIForMovies('retitled', distractorPrompt)
    
    return {
      puzzle_date: targetDate,
      film_id: movie.id,
      film_title: movie.title,
      localized_title: selectedTitle.title,
      country_code: selectedTitle.iso_3166_1,
      distractor_ids: distractorIds.slice(0, 4),
      difficulty_level: Math.ceil(config.obscurityThreshold || 5)
    }
  }
  
  throw new Error('Could not find suitable movie for Retitled puzzle')
}

// Generate puzzle for Budget Bracket game
async function generateBudgetBracketPuzzle(
  targetDate: string,
  config: GenerationConfig,
  recentMovieIds: number[]
): Promise<any> {
  const pairs = []
  const usedMovieIds = new Set<number>()
  
  // Generate 5 rounds of movie pairs
  for (let round = 1; round <= 5; round++) {
    const prompt = `Find pairs of movies with interesting budget comparisons for round ${round}.
    The budgets should be relatively close (within ${(config.budgetClosenessThreshold || 0.3) * 100}% of each other).
    Focus on movies where the budget might be surprising.
    Avoid these movie IDs: ${[...recentMovieIds, ...Array.from(usedMovieIds)].join(', ')}.
    Return 4 movie TMDB IDs.`
    
    const movieIds = await queryOpenAIForMovies('budget-bracket', prompt)
    
    // Fetch movie details and validate budgets
    const validMovies = []
    for (const id of movieIds) {
      const movie = await getMovieById(id) as TMDBMovieDetails
      if (movie && movie.budget && movie.budget > 0 && !usedMovieIds.has(id)) {
        validMovies.push(movie)
        usedMovieIds.add(id)
      }
    }
    
    // Create pairs with appropriate budget differences
    if (validMovies.length >= 2) {
      validMovies.sort((a, b) => (a.budget || 0) - (b.budget || 0))
      
      // Select two movies with appropriate budget difference
      for (let i = 0; i < validMovies.length - 1; i++) {
        const movie1 = validMovies[i]
        const movie2 = validMovies[i + 1]
        const budgetRatio = (movie2.budget || 0) / (movie1.budget || 1)
        
        if (budgetRatio <= 1 + (config.budgetClosenessThreshold || 0.3)) {
          pairs.push([
            {
              id: movie1.id,
              title: movie1.title,
              poster_path: movie1.poster_path,
              release_date: movie1.release_date,
              budget: movie1.budget
            },
            {
              id: movie2.id,
              title: movie2.title,
              poster_path: movie2.poster_path,
              release_date: movie2.release_date,
              budget: movie2.budget
            }
          ])
          break
        }
      }
    }
  }
  
  if (pairs.length < 5) {
    throw new Error('Could not generate enough movie pairs for Budget Bracket')
  }
  
  return {
    puzzle_date: targetDate,
    seed_value: Math.random().toString(36).substring(2, 15),
    pairs: pairs
  }
}

// Generate puzzle for Cast Climb game
async function generateCastClimbPuzzle(
  targetDate: string,
  config: GenerationConfig,
  recentMovieIds: number[]
): Promise<any> {
  const prompt = `Find a movie with a memorable ensemble cast that would make a good guessing game.
  The movie should have at least 4 well-known actors.
  Avoid these recent movie IDs: ${recentMovieIds.join(', ')}.
  Return 5 potential TMDB movie IDs.`
  
  const suggestedIds = await queryOpenAIForMovies('cast-climb', prompt)
  
  for (const movieId of suggestedIds) {
    const movie = await getMovieById(movieId) as TMDBMovieDetails
    if (!movie || !isMovieAppropriate(movie, config)) continue
    
    // Get cast information
    const credits = await getMovieCredits(movieId)
    if (!credits || credits.cast.length < 4) continue
    
    // Select top 4 actors (mix of leads and supporting)
    const actors = credits.cast
      .slice(0, 4)
      .reverse() // Reverse to show supporting actors first
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path,
        order: actor.order
      }))
    
    return {
      puzzle_date: targetDate,
      film_id: movie.id,
      film_title: movie.title,
      film_poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      film_release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      actors: actors,
      total_actors: 4,
      difficulty_level: Math.ceil(config.obscurityThreshold || 5)
    }
  }
  
  throw new Error('Could not find suitable movie for Cast Climb puzzle')
}

// Generate puzzle for Poster Pixels game
async function generatePosterPixelsPuzzle(
  targetDate: string,
  config: GenerationConfig,
  recentMovieIds: number[]
): Promise<any> {
  const prompt = `Find a movie with an iconic and recognizable poster that would work well for a pixelated guessing game.
  The poster should have distinctive visual elements even when blurred.
  Avoid these recent movie IDs: ${recentMovieIds.join(', ')}.
  Return 5 potential TMDB movie IDs.`
  
  const suggestedIds = await queryOpenAIForMovies('poster-pixels', prompt)
  
  for (const movieId of suggestedIds) {
    const movie = await getMovieById(movieId) as TMDBMovieDetails
    if (!movie || !movie.poster_path) continue
    if (!isMovieAppropriate(movie, config)) continue
    
    return {
      puzzle_date: targetDate,
      film_id: movie.id,
      film_title: movie.title,
      film_poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      film_release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      clarity_levels: [5, 15, 35, 65, 100],
      difficulty_level: Math.ceil(config.obscurityThreshold || 5),
      seed_value: Math.random().toString(36).substring(2, 15),
      is_published: false // Start as unpublished for review
    }
  }
  
  throw new Error('Could not find suitable movie for Poster Pixels puzzle')
}

// Main function to generate smart puzzle
export async function generateSmartPuzzle(
  request: SmartPuzzleRequest,
  recentMovieIds: number[] = []
): Promise<SmartPuzzleResponse> {
  try {
    const config = { ...DEFAULT_CONFIG, ...request.config }
    
    let puzzle
    switch (request.gameType) {
      case 'retitled':
        puzzle = await generateRetitledPuzzle(request.targetDate, config, recentMovieIds)
        break
      case 'budget-bracket':
        puzzle = await generateBudgetBracketPuzzle(request.targetDate, config, recentMovieIds)
        break
      case 'cast-climb':
        puzzle = await generateCastClimbPuzzle(request.targetDate, config, recentMovieIds)
        break
      case 'poster-pixels':
        puzzle = await generatePosterPixelsPuzzle(request.targetDate, config, recentMovieIds)
        break
      default:
        throw new Error(`Unsupported game type: ${request.gameType}`)
    }
    
    return {
      success: true,
      puzzle
    }
  } catch (error) {
    console.error('Error generating smart puzzle:', error)
    
    // Provide fallback suggestions
    const fallbackPrompt = `Suggest 5 popular movies that would work well for puzzle games. Return TMDB IDs.`
    try {
      const suggestionIds = await queryOpenAIForMovies(request.gameType, fallbackPrompt)
      
      const suggestions = []
      for (const id of suggestionIds) {
        const movie = await getMovieById(id)
        if (movie) suggestions.push(movie as TMDBMovie)
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions
      }
    } catch {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Batch generation helper (future bulk actions)
export async function generateSmartPuzzlesBatch(
  requests: SmartPuzzleRequest[],
  baseRecentMovieIds: number[] = []
) {
  const results: SmartPuzzleResponse[] = []
  const used = new Set<number>(baseRecentMovieIds)
  for (const req of requests) {
    const res = await generateSmartPuzzle(req, [...used])
    results.push(res)
    // If successful, add all involved film ids to the set to avoid re-use within the batch
    if (res.success && res.puzzle) {
      const ids: number[] = (() => {
        if (req.gameType === 'budget-bracket') {
          const pairs = Array.isArray(res.puzzle?.pairs) ? res.puzzle.pairs : []
          const s = new Set<number>()
          for (const pair of pairs) {
            if (Array.isArray(pair)) pair.forEach((m: any) => { if (m?.id) s.add(m.id) })
          }
          return [...s]
        }
        return typeof res.puzzle?.film_id === 'number' ? [res.puzzle.film_id] : []
      })()
      ids.forEach(id => used.add(id))
    }
  }
  return results
}

// Check for recent movie usage across games
export async function getRecentMovieIds(
  supabase: any,
  gameType?: string,
  daysBack: number = 30
): Promise<number[]> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
  
  const movieIds = new Set<number>()
  
  // Check each game type's puzzles
  const tables = gameType 
    ? [`${gameType.replace('-', '_')}_puzzles`]
    : ['retitled_puzzles', 'budget_bracket_puzzles', 'cast_climb_puzzles', 'poster_pixels_puzzles']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('film_id, pairs')
      .gte('puzzle_date', cutoffDateStr)
    
    if (!error && data) {
      data.forEach((puzzle: any) => {
        if (puzzle.film_id) {
          movieIds.add(puzzle.film_id)
        }
        // Handle budget bracket pairs
        if (puzzle.pairs && Array.isArray(puzzle.pairs)) {
          puzzle.pairs.forEach((pair: any[]) => {
            pair.forEach((movie: any) => {
              if (movie.id) movieIds.add(movie.id)
            })
          })
        }
      })
    }
  }
  
  return Array.from(movieIds)
}
