import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateDailyPuzzle } from "@/lib/poster-pixels"

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
    let hasPlayedBefore = false
    let userGame = null
    let userGuesses: any[] = []
    
    if (user) {
      // Check if user has EVER played Poster Pixels before
      const { data: anyPreviousGames } = await supabase
        .from('poster_pixels_games')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGames
      
      // Get user's game for this puzzle
      const { data: gameData } = await supabase
        .from('poster_pixels_games')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .single()
      
      if (gameData) {
        hasPlayed = true
        userGame = gameData
        
        // Get all guesses for this game
        const { data: guessesData } = await supabase
          .from('poster_pixels_guesses')
          .select('*')
          .eq('user_id', user.id)
          .eq('puzzle_id', puzzle.id)
          .order('created_at', { ascending: true })
        
        if (guessesData) {
          userGuesses = guessesData.map(guess => ({
            id: guess.id,
            guessedMovieId: guess.guessed_movie_id,
            guessedMovieTitle: guess.guessed_movie_title,
            isCorrect: guess.is_correct,
            clarityLevel: guess.clarity_level,
            guessTimeMs: guess.guess_time_ms,
            createdAt: guess.created_at
          }))
        }
      }
    }

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        puzzleNumber: puzzle.puzzle_number,
        filmId: puzzle.film_id,
        filmTitle: puzzle.film_title,
        filmPosterUrl: puzzle.film_poster_url,
        filmReleaseYear: puzzle.film_release_year,
        clarityLevels: puzzle.clarity_levels,
        difficultyLevel: puzzle.difficulty_level,
        seedValue: puzzle.seed_value,
        movieData: puzzle.movie_data
      },
      hasPlayed,
      hasPlayedBefore,
      userGame: userGame ? {
        id: userGame.id,
        won: userGame.won,
        totalTimeMs: userGame.total_time_ms,
        finalClarityLevel: userGame.final_clarity_level,
        finalScore: userGame.final_score,
        completed: userGame.completed,
        numGuesses: userGame.num_guesses
      } : null,
      userGuesses
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
      .from('poster_pixels_puzzles')
      .select('*')
      .eq('puzzle_date', dateString)
      .single()

    if (existingPuzzle && !fetchError) {
      return existingPuzzle
    }

    // If no existing puzzle, generate a new one
    console.log(`Generating new Poster Pixels puzzle for ${dateString}`)
    const generatedPuzzle = await generateDailyPuzzle(date)
    
    if (!generatedPuzzle) {
      console.error('Failed to generate puzzle for date:', dateString)
      return null
    }

    // Insert the new puzzle
    const { data: insertedPuzzle, error: insertError } = await supabase
      .from('poster_pixels_puzzles')
      .insert({
        puzzle_date: generatedPuzzle.puzzle_date,
        puzzle_number: generatedPuzzle.puzzle_number,
        film_id: generatedPuzzle.film_id,
        film_title: generatedPuzzle.film_title,
        film_poster_url: generatedPuzzle.film_poster_url,
        film_release_year: generatedPuzzle.film_release_year,
        clarity_levels: generatedPuzzle.clarity_levels,
        difficulty_level: generatedPuzzle.difficulty_level,
        seed_value: generatedPuzzle.seed_value,
        is_published: true,
        movie_data: generatedPuzzle.movie_data
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a unique constraint violation (puzzle already exists)
      if (insertError.code === '23505') {
        console.log('Puzzle was created concurrently, fetching existing one')
        const { data: concurrentPuzzle } = await supabase
          .from('poster_pixels_puzzles')
          .select('*')
          .eq('puzzle_date', dateString)
          .single()
        return concurrentPuzzle
      } else {
        console.error('Error inserting puzzle:', insertError)
        return null
      }
    }

    console.log(`Successfully created Poster Pixels puzzle for ${dateString}`)
    return insertedPuzzle
  } catch (error) {
    console.error('Error in getOrCreatePuzzleForDate:', error)
    return null
  }
}