import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  validatePuzzleDate, 
  getOrCreatePuzzleForDate,
  createErrorResponse,
  checkUserPlayHistory,
  type PuzzleConfig 
} from '@/lib/api/puzzle-by-date'
import { calculatePuzzleNumberFromLaunch } from '@/lib/puzzle-numbering'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateString = searchParams.get('date')
    
    // Validate date using shared utility
    const validation = validatePuzzleDate(dateString)
    if (!validation.isValid) {
      return createErrorResponse(validation.error!.message, validation.error!.status)
    }
    
    const puzzleDate = validation.puzzleDate!
    const supabase = await createClient()
    
    // Get current user for checking play status
    const { data: { user } } = await supabase.auth.getUser()

    // Service role client for creating puzzles if needed
    const { createServiceClient } = await import('@/lib/supabase/server')
    const serviceSupabase = createServiceClient()
    
    // Configuration for Budget Bracket puzzle generation
    const puzzleConfig: PuzzleConfig = {
      tableName: 'budget_bracket_puzzles',
      generatePuzzle: generateBudgetBracketPuzzle,
      insertPuzzleData: (puzzle) => ({
        puzzle_date: puzzle.puzzle_date,
        seed_value: puzzle.seed_value,
        pairs: puzzle.pairs
      })
    }
    
    // Get puzzle without allowing creation (by-date should not create puzzles)
    const puzzle = await getOrCreatePuzzleForDate(serviceSupabase, puzzleDate, puzzleConfig, false)
    
    if (!puzzle) {
      return createErrorResponse('No puzzle available for this date. Try today\'s puzzle instead.', 404)
    }

    // Check if user has already played this puzzle
    let hasPlayed = false
    let userResult = null
    let hasPlayedBefore = false
    
    if (user) {
      // Check if user has EVER played Budget Bracket before
      hasPlayedBefore = await checkUserPlayHistory(supabase, user.id, 'budget_bracket_games')
      
      // Check if the user has already played this specific puzzle
      const { data: existingGame } = await supabase
        .from('budget_bracket_games')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .single()
      
      if (existingGame) {
        hasPlayed = true
        userResult = {
          rounds_completed: existingGame.rounds_completed,
          final_result: existingGame.final_result,
          choices: existingGame.choices,
          total_duration_ms: existingGame.total_duration_ms
        }
      }
    }

    // Calculate puzzle number using shared utility
    const puzzleNumber = await calculatePuzzleNumberFromLaunch(
      supabase, 
      'budget-bracket', 
      new Date(puzzle.puzzle_date)
    )

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzle_date: puzzle.puzzle_date,
        puzzle_number: puzzleNumber,
        name: puzzle.name, // Include puzzle name for consistency with today route
        seed_value: puzzle.seed_value,
        pairs: puzzle.pairs,
        has_played: hasPlayed,
        has_played_before: hasPlayedBefore,
        user_result: userResult
      }
    })
  } catch (error) {
    console.error('Error fetching puzzle by date:', error)
    
    // Return standardized error response
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500)
    }
    return createErrorResponse('Internal server error', 500)
  }
}

// Budget Bracket specific puzzle generation
async function generateBudgetBracketPuzzle(date: Date) {
  const dateString = date.toISOString().split('T')[0]
  
  try {
    // Import necessary functions and generate puzzle
    const { 
      generateBudgetBracketSeed,
      validateBudgetBracketMovie
    } = await import('@/lib/budget-bracket')
    const { hydrateMoviesFromTmdbIds } = await import('@/lib/movie-hydration')
    const { getBlendedMoviePool } = await import('@/lib/tmdb-trending')
    
    const seed = generateBudgetBracketSeed(date)
    
    // Get fresh movie pool with trending integration
    const blendedMovies = await getBlendedMoviePool(0.4, 80) // 40% trending, min 80 movies
    
    if (blendedMovies.length < 20) {
      console.error('Insufficient trending movie data available')
      return null
    }
    
    // Extract TMDB IDs from blended movies
    const tmdbIds = blendedMovies.map(movie => movie.id)
    
    // Use unified hydration system to get consistent BudgetBracketMovie structure
    const hydratedMovies = await hydrateMoviesFromTmdbIds(tmdbIds)
    
    if (hydratedMovies.length < 15) {
      console.error(`Insufficient movies with valid budget data: ${hydratedMovies.length} found`)
      return null
    }
    
    // Validate all movies meet Budget Bracket requirements
    const validMovies = hydratedMovies.filter(movie => validateBudgetBracketMovie(movie))
    
    if (validMovies.length < 10) {
      console.error(`Insufficient valid Budget Bracket movies: ${validMovies.length} found`)
      return null
    }
    
    // Generate puzzle pairs using the same algorithm as today's puzzle
    const pairs = await generatePairsWithUnifiedStructure(validMovies, seed)

    return {
      puzzle_date: dateString,
      seed_value: seed,
      pairs: pairs
    }
  } catch (error) {
    console.error('Error generating Budget Bracket puzzle:', error)
    return null
  }
}

// Helper function to generate pairs with unified structure
async function generatePairsWithUnifiedStructure(movies: any[], seed: string) {
  const { SeededRandom, DIFFICULTY_TARGETS, calculateDifficultyRatio } = await import('@/lib/budget-bracket')
  const { createUnifiedMoviePair } = await import('@/lib/movie-hydration')
  
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