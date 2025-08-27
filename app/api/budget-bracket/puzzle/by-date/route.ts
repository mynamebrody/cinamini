import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyPuzzle } from '@/lib/budget-bracket'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateString = searchParams.get('date')
    
    if (!dateString) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user for checking play status
    const { data: { user } } = await supabase.auth.getUser()
    
    const puzzleDate = new Date(dateString + 'T00:00:00Z')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    
    // Check if date is valid
    if (isNaN(puzzleDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }
    
    // Check if date is in the future
    if (puzzleDate > today) {
      return NextResponse.json({ error: "Cannot access future puzzles" }, { status: 400 })
    }
    
    // Check if date is before game launch
    const launchDate = new Date('2024-01-01T00:00:00Z')
    if (puzzleDate < launchDate) {
      return NextResponse.json({ error: "No puzzle available for this date" }, { status: 404 })
    }

    // Service role client for creating puzzles if needed
    const { createServiceClient } = await import('@/lib/supabase/server')
    const serviceSupabase = createServiceClient()
    
    // Get or create puzzle for the specified date
    const puzzle = await getOrCreatePuzzleForDate(serviceSupabase, puzzleDate)
    
    if (!puzzle) {
      return NextResponse.json({ error: 'No puzzle available for this date' }, { status: 404 })
    }

    // Check if user has already played this puzzle
    let hasPlayed = false
    let userResult = null
    let hasPlayedBefore = false
    
    if (user) {
      // Check if user has EVER played Budget Bracket before
      const { data: anyPreviousGames } = await supabase
        .from('budget_bracket_games')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGames
      
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

    // Calculate puzzle number based on the date
    const { count: previousPuzzleCount } = await supabase
      .from('budget_bracket_puzzles')
      .select('*', { count: 'exact', head: true })
      .lt('puzzle_date', puzzle.puzzle_date)

    const puzzleNumber = (previousPuzzleCount || 0) + 1

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzle_date: puzzle.puzzle_date,
        puzzle_number: puzzleNumber,
        seed_value: puzzle.seed_value,
        pairs: puzzle.pairs,
        has_played: hasPlayed,
        has_played_before: hasPlayedBefore,
        user_result: userResult
      }
    })
  } catch (error) {
    console.error('Error fetching puzzle by date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getOrCreatePuzzleForDate(supabase: any, date: Date): Promise<any | null> {
  const dateString = date.toISOString().split('T')[0]
  
  try {
    // First, try to get existing puzzle
    const { data: existingPuzzle, error: fetchError } = await supabase
      .from('budget_bracket_puzzles')
      .select('*')
      .eq('puzzle_date', dateString)
      .single()

    if (existingPuzzle && !fetchError) {
      return existingPuzzle
    }

    // If no existing puzzle, generate a new one (copy logic from today's puzzle)
    console.log(`Generating new Budget Bracket puzzle for ${dateString}`)
    
    // Import necessary functions and generate puzzle
    const { 
      generateBudgetBracketSeed,
      DIFFICULTY_TARGETS,
      SeededRandom,
      calculateDifficultyRatio,
      type BudgetBracketMovie,
      type MoviePair,
      validateBudgetBracketMovie
    } = await import('@/lib/budget-bracket')
    const { hydrateMoviesFromTmdbIds, createUnifiedMoviePair } = await import('@/lib/movie-hydration')
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
    const pairs = generatePairsWithUnifiedStructure(validMovies, seed)

    // Insert the new puzzle
    const { data: insertedPuzzle, error: insertError } = await supabase
      .from('budget_bracket_puzzles')
      .insert({
        puzzle_date: dateString,
        seed_value: seed,
        pairs: pairs
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a unique constraint violation (puzzle already exists)
      if (insertError.code === '23505') {
        console.log('Puzzle was created concurrently, fetching existing one')
        const { data: concurrentPuzzle } = await supabase
          .from('budget_bracket_puzzles')
          .select('*')
          .eq('puzzle_date', dateString)
          .single()
        return concurrentPuzzle
      } else {
        console.error('Error inserting puzzle:', insertError)
        return null
      }
    }

    console.log(`Successfully created Budget Bracket puzzle for ${dateString}`)
    return insertedPuzzle
  } catch (error) {
    console.error('Error in getOrCreatePuzzleForDate:', error)
    return null
  }
}

// Helper function to generate pairs with unified structure
function generatePairsWithUnifiedStructure(movies: any[], seed: string) {
  const { SeededRandom, DIFFICULTY_TARGETS, calculateDifficultyRatio } = require('@/lib/budget-bracket')
  const { createUnifiedMoviePair } = require('@/lib/movie-hydration')
  
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