import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  generateDailySeed, 
  generatePuzzlePairs, 
  DIFFICULTY_TARGETS,
  type BudgetBracketMovie,
  type MoviePair 
} from '@/lib/budget-bracket'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    const seed = generateDailySeed(today)

    // Check if today's puzzle already exists
    const { data: existingPuzzle, error: puzzleError } = await supabase
      .from('budget_bracket_puzzles')
      .select('*')
      .eq('puzzle_date', todayStr)
      .single()

    if (puzzleError && puzzleError.code !== 'PGRST116') {
      console.error('Error fetching puzzle:', puzzleError)
      return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 })
    }

    let puzzle = existingPuzzle

    // If puzzle doesn't exist, generate it
    if (!puzzle) {
      // Get all available movies for puzzle generation
      const { data: movies, error: moviesError } = await supabase
        .from('budget_bracket_movies')
        .select('*')
        .gte('production_budget', 5000000) // Minimum $5M budget
        .gte('popularity_score', 30) // Minimum popularity
        .order('popularity_score', { ascending: false })
        .limit(200) // Get top 200 for variety

      if (moviesError || !movies || movies.length < 10) {
        console.error('Error fetching movies:', moviesError)
        return NextResponse.json({ error: 'Insufficient movie data' }, { status: 500 })
      }

      try {
        // Generate puzzle pairs
        const pairs = generatePuzzlePairs(movies as BudgetBracketMovie[], seed)
        
        // Store the puzzle
        const { data: newPuzzle, error: insertError } = await supabase
          .from('budget_bracket_puzzles')
          .insert({
            puzzle_date: todayStr,
            seed_value: seed,
            movie_pairs: pairs,
            difficulty_progression: DIFFICULTY_TARGETS
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating puzzle:', insertError)
          return NextResponse.json({ error: 'Failed to create puzzle' }, { status: 500 })
        }

        puzzle = newPuzzle
      } catch (error) {
        console.error('Error generating puzzle pairs:', error)
        return NextResponse.json({ error: 'Failed to generate puzzle' }, { status: 500 })
      }
    }

    // Check if user has already played today
    const { data: existingGame } = await supabase
      .from('budget_bracket_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzle.id)
      .single()

    // Return puzzle data (without revealing correct answers)
    const puzzleData = {
      id: puzzle.id,
      puzzle_date: puzzle.puzzle_date,
      seed_value: puzzle.seed_value,
      pairs: (puzzle.movie_pairs as MoviePair[]).map(pair => ({
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
      })),
      has_played: !!existingGame,
      user_result: existingGame ? {
        rounds_completed: existingGame.rounds_completed,
        final_result: existingGame.final_result,
        choices: existingGame.choices,
        total_duration_ms: existingGame.total_duration_ms
      } : null
    }

    return NextResponse.json(puzzleData)
  } catch (error) {
    console.error('Unexpected error in Budget Bracket puzzle API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}