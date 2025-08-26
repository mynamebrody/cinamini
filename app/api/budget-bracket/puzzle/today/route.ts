import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { 
  generateBudgetBracketSeed,
  DIFFICULTY_TARGETS,
  SeededRandom,
  calculateDifficultyRatio,
  type BudgetBracketMovie,
  type MoviePair 
} from '@/lib/budget-bracket'
import { hydrateMoviesFromTmdbIds, createUnifiedMoviePair, validateBudgetBracketMovie } from '@/lib/movie-hydration'
import { getBlendedMoviePool } from '@/lib/tmdb-trending'

export async function GET() {
  try {
    const supabase = await createClient()
    const supabaseService = createServiceClient()
    
    // Check if user is authenticated (optional now)
    const { data: { user } } = await supabase.auth.getUser()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    const seed = generateBudgetBracketSeed(today)

    // Check if today's puzzle already exists (using service client to bypass RLS)
    const { data: existingPuzzle, error: puzzleError } = await supabaseService
      .from('budget_bracket_puzzles')
      .select('*, puzzle_number')
      .eq('puzzle_date', todayStr)
      .single()

    if (puzzleError && puzzleError.code !== 'PGRST116') {
      console.error('Error fetching puzzle:', puzzleError)
      return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 })
    }

    let puzzle = existingPuzzle

    // If puzzle doesn't exist, generate it
    if (!puzzle) {
      try {
        console.log('Generating new Budget Bracket puzzle with trending movies...')
        
        // Get fresh movie pool with trending integration
        const blendedMovies = await getBlendedMoviePool(0.4, 80) // 40% trending, min 80 movies
        
        if (blendedMovies.length < 20) {
          throw new Error('Insufficient trending movie data available')
        }
        
        // Extract TMDB IDs from blended movies
        const tmdbIds = blendedMovies.map(movie => movie.id)
        console.log(`Hydrating ${tmdbIds.length} movies using unified hydration system...`)
        
        // Use unified hydration system to get consistent BudgetBracketMovie structure
        const hydratedMovies = await hydrateMoviesFromTmdbIds(tmdbIds)
        
        if (hydratedMovies.length < 15) {
          throw new Error(`Insufficient movies with valid budget data: ${hydratedMovies.length} found, need at least 15`)
        }
        
        // Validate all movies meet Budget Bracket requirements
        const validMovies = hydratedMovies.filter(movie => validateBudgetBracketMovie(movie))
        
        if (validMovies.length < 10) {
          throw new Error(`Insufficient valid Budget Bracket movies: ${validMovies.length} found, need at least 10`)
        }
        
        console.log(`Budget pool created: ${validMovies.length} movies (all with unified structure)`)
        
        // Generate puzzle pairs using the traditional algorithm but with unified structure
        const pairs = generatePairsWithUnifiedStructure(validMovies, seed)
        
        
        
        // Store the puzzle (using service client to bypass RLS)
        const { data: newPuzzle, error: insertError } = await supabaseService
          .from('budget_bracket_puzzles')
          .insert({
            puzzle_date: todayStr,
            seed_value: seed,
            pairs: pairs,
            difficulty_progression: DIFFICULTY_TARGETS,
            is_published: true
          })
          .select('*, puzzle_number')
          .single()

        if (insertError) {
          console.error('Error creating puzzle:', insertError)
          return NextResponse.json({ error: 'Failed to create puzzle' }, { status: 500 })
        }

        puzzle = newPuzzle
      } catch (error) {
        console.error('Error generating puzzle pairs:', error)
        
        // Enhanced error handling with more specific messages
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // If it's a trending movie error, fall back to database
        if (errorMessage.includes('trending') || errorMessage.includes('TMDB')) {
          console.error('Trending movies failed, falling back to database movies...')
          return await generateFallbackPuzzle(supabaseService, todayStr, seed)
        }
        
        return NextResponse.json({ 
          error: 'Failed to generate puzzle',
          details: errorMessage 
        }, { status: 500 })
      }
    }

    // Check if user has already played today
    let hasPlayedBefore = false
    let existingGame = null
    
    if (user) {
      // First check if user has EVER played Budget Bracket before (for how-to-play modal)
      const { data: anyPreviousGames } = await supabase
        .from("budget_bracket_games")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGames
      
      // Now check today's puzzle specifically
      const { data: gameData } = await supabase
        .from('budget_bracket_games')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .single()
      
      existingGame = gameData
    }

    return createPuzzleResponse(puzzle, existingGame, hasPlayedBefore)
  } catch (error) {
    console.error('Unexpected error in Budget Bracket puzzle API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Removed: estimateBudgetFromMovie function
// Budget Bracket now only uses real TMDB budget data

/**
 * Fallback to hardcoded movies when trending system fails
 */
async function generateFallbackPuzzle(supabase: any, todayStr: string, seed: string) {
  try {
    console.log('Trending system failed, using hardcoded fallback movies...')
    
    // Hardcoded high-budget movies for fallback (based on real TMDB data)
    const fallbackMovies: BudgetBracketMovie[] = [
      {
        id: 299536,
        tmdb_id: 299536,
        title: "Avengers: Infinity War",
        production_budget: 321000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
        release_date: "2018-04-27",
        popularity_score: 125.0,
        seedValue: "299536",
        gameRelevanceScore: 1.25
      },
      {
        id: 299534,
        tmdb_id: 299534,
        title: "Avengers: Endgame",
        production_budget: 356000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        release_date: "2019-04-26",
        popularity_score: 145.0,
        seedValue: "299534",
        gameRelevanceScore: 1.45
      },
      {
        id: 597,
        tmdb_id: 597,
        title: "Titanic",
        production_budget: 200000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
        release_date: "1997-11-18",
        popularity_score: 85.0,
        seedValue: "597",
        gameRelevanceScore: 0.85
      },
      {
        id: 19995,
        tmdb_id: 19995,
        title: "Avatar",
        production_budget: 237000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg",
        release_date: "2009-12-18",
        popularity_score: 120.0,
        seedValue: "19995",
        gameRelevanceScore: 1.20
      },
      {
        id: 24428,
        tmdb_id: 24428,
        title: "The Avengers",
        production_budget: 220000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
        release_date: "2012-05-04",
        popularity_score: 100.0,
        seedValue: "24428",
        gameRelevanceScore: 1.00
      },
      {
        id: 118340,
        tmdb_id: 118340,
        title: "Guardians of the Galaxy",
        production_budget: 170000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg",
        release_date: "2014-07-30",
        popularity_score: 90.0,
        seedValue: "118340",
        gameRelevanceScore: 0.90
      },
      {
        id: 315635,
        tmdb_id: 315635,
        title: "Spider-Man: Homecoming",
        production_budget: 175000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg",
        release_date: "2017-07-07",
        popularity_score: 88.0,
        seedValue: "315635",
        gameRelevanceScore: 0.88
      },
      {
        id: 550,
        tmdb_id: 550,
        title: "Fight Club",
        production_budget: 63000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        release_date: "1999-10-15",
        popularity_score: 95.0,
        seedValue: "550",
        gameRelevanceScore: 0.95
      },
      {
        id: 155,
        tmdb_id: 155,
        title: "The Dark Knight",
        production_budget: 185000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        release_date: "2008-07-18",
        popularity_score: 110.0,
        seedValue: "155",
        gameRelevanceScore: 1.10
      },
      {
        id: 27205,
        tmdb_id: 27205,
        title: "Inception",
        production_budget: 160000000,
        budget_source: "tmdb",
        is_budget_estimated: false,
        poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        release_date: "2010-07-16",
        popularity_score: 105.0,
        seedValue: "27205",
        gameRelevanceScore: 1.05
      }
    ]

    const pairs = generatePairsWithUnifiedStructure(fallbackMovies, seed)
    
    const { data: newPuzzle, error: insertError } = await supabase
      .from('budget_bracket_puzzles')
      .insert({
        puzzle_date: todayStr,
        seed_value: seed,
        pairs: pairs,
        difficulty_progression: DIFFICULTY_TARGETS,
        is_published: true
      })
      .select('*, puzzle_number')
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create fallback puzzle' }, { status: 500 })
    }
    
    console.log('Created fallback puzzle using hardcoded movies')
    return createPuzzleResponse(newPuzzle, null)
  } catch (error) {
    console.error('Fallback system failed:', error)
    return NextResponse.json({ error: 'Fallback system failed' }, { status: 500 })
  }
}

/**
 * Create consistent puzzle response
 */
function createPuzzleResponse(puzzle: any, existingGame: any, hasPlayedBefore: boolean = false) {
  const pairs = (puzzle.pairs as MoviePair[]).map(pair => ({
    round: pair.round,
    movieA: {
      tmdb_id: pair.movieA.tmdb_id,
      title: pair.movieA.title,
      poster_path: pair.movieA.poster_path,
      release_date: pair.movieA.release_date
    },
    movieB: {
      tmdb_id: pair.movieB.tmdb_id,
      title: pair.movieB.title,
      poster_path: pair.movieB.poster_path,
      release_date: pair.movieB.release_date
    }
  }))


  const puzzleData = {
    id: puzzle.id,
    puzzle_date: puzzle.puzzle_date,
    puzzle_number: puzzle.puzzle_number,
    name: puzzle.name, // Include optional name
    seed_value: puzzle.seed_value,
    pairs,
    has_played: !!existingGame,
    hasPlayedBefore,
    user_result: existingGame ? {
      rounds_completed: existingGame.rounds_completed,
      final_result: existingGame.final_result,
      choices: existingGame.choices,
      total_duration_ms: existingGame.total_duration_ms
    } : null
  }

  return NextResponse.json(puzzleData)
}

/**
 * Generate pairs using traditional algorithm but with unified structure
 * This ensures compatibility with existing logic while using unified hydration
 */
function generatePairsWithUnifiedStructure(movies: BudgetBracketMovie[], seed: string) {
  const rng = new SeededRandom(seed)
  const pairs = []
  const usedMovies = new Set<number>()

  for (let round = 0; round < 5; round++) {
    const targetDifficulty = DIFFICULTY_TARGETS[round]
    let attempts = 0
    const maxAttempts = 1000

    while (attempts < maxAttempts) {
      // Get two random unused movies
      const availableMovies = movies.filter(m => !usedMovies.has(m.tmdb_id))
      if (availableMovies.length < 2) break

      const movieA = availableMovies[rng.nextInt(0, availableMovies.length - 1)]
      let movieB = availableMovies[rng.nextInt(0, availableMovies.length - 1)]
      
      // Ensure different movies
      while (movieB.tmdb_id === movieA.tmdb_id) {
        movieB = availableMovies[rng.nextInt(0, availableMovies.length - 1)]
      }

      // Check if it's a valid pair based on difficulty
      const ratio = calculateDifficultyRatio(movieA.production_budget, movieB.production_budget)
      const isValid = targetDifficulty >= 1.5 
        ? ratio >= (targetDifficulty - 0.3) 
        : ratio <= (targetDifficulty + 0.3)

      if (isValid) {
        // Create unified movie pair using the helper function
        const unifiedPair = createUnifiedMoviePair(movieA, movieB, round + 1)
        pairs.push(unifiedPair)

        usedMovies.add(movieA.tmdb_id)
        usedMovies.add(movieB.tmdb_id)
        break
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error(`Could not generate valid pair for round ${round + 1}`)
    }
  }

  return pairs
}

