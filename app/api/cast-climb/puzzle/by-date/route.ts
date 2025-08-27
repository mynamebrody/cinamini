import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateDailyPuzzle } from "@/lib/cast-climb"

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
    let userGuesses: any[] = []
    
    if (user) {
      // Check if user has EVER played Cast Climb before
      const { data: anyPreviousGuesses } = await supabase
        .from('cast_climb_guesses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGuesses
      
      // Get all guesses for this puzzle
      const { data: guessesData } = await supabase
        .from('cast_climb_guesses')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .order('attempt_number', { ascending: true })
      
      if (guessesData && guessesData.length > 0) {
        hasPlayed = true
        userGuesses = guessesData.map(guess => ({
          id: guess.id,
          guessFilmId: guess.guess_film_id,
          guessFilmTitle: guess.guess_film_title,
          isCorrect: guess.is_correct,
          actorsRevealed: guess.actors_revealed,
          solveTimeMs: guess.solve_time_ms,
          attemptNumber: guess.attempt_number,
          createdAt: guess.created_at
        }))
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
        actors: puzzle.actors,
        totalActors: puzzle.total_actors,
        difficultyLevel: puzzle.difficulty_level,
        funFact: puzzle.fun_fact
      },
      hasPlayed,
      hasPlayedBefore,
      userGuesses,
      gameCompleted: hasPlayed && (
        userGuesses.some(g => g.isCorrect) || 
        userGuesses.length >= 4
      )
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
      .from('cast_climb_puzzles')
      .select('*')
      .eq('puzzle_date', dateString)
      .single()

    if (existingPuzzle && !fetchError) {
      return existingPuzzle
    }

    // If no existing puzzle, generate a new one
    console.log(`Generating new Cast Climb puzzle for ${dateString}`)
    const generatedPuzzle = await generateDailyPuzzle(date)
    
    if (!generatedPuzzle) {
      console.error('Failed to generate puzzle for date:', dateString)
      return null
    }

    // Insert the new puzzle
    const { data: insertedPuzzle, error: insertError } = await supabase
      .from('cast_climb_puzzles')
      .insert({
        puzzle_date: generatedPuzzle.puzzle_date,
        puzzle_number: generatedPuzzle.puzzle_number,
        film_id: generatedPuzzle.film_id,
        film_title: generatedPuzzle.film_title,
        film_poster_url: generatedPuzzle.film_poster_url,
        film_release_year: generatedPuzzle.film_release_year,
        actors: generatedPuzzle.actors,
        total_actors: generatedPuzzle.total_actors,
        difficulty_level: generatedPuzzle.difficulty_level,
        fun_fact: generatedPuzzle.fun_fact
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a unique constraint violation (puzzle already exists)
      if (insertError.code === '23505') {
        console.log('Puzzle was created concurrently, fetching existing one')
        const { data: concurrentPuzzle } = await supabase
          .from('cast_climb_puzzles')
          .select('*')
          .eq('puzzle_date', dateString)
          .single()
        return concurrentPuzzle
      } else {
        console.error('Error inserting puzzle:', insertError)
        return null
      }
    }

    console.log(`Successfully created Cast Climb puzzle for ${dateString}`)
    return insertedPuzzle
  } catch (error) {
    console.error('Error in getOrCreatePuzzleForDate:', error)
    return null
  }
}