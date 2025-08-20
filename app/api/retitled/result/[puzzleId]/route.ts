import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMovieById, getReleaseYear } from "@/lib/tmdb"
import { getCountryFlag } from "@/lib/flag-emojis"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const puzzleId = (await params).puzzleId

    // Get the puzzle to get correct answer info
    const { data: puzzle, error: puzzleError } = await supabase
      .from("retitled_puzzles")
      .select("*")
      .eq("id", puzzleId)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: "Invalid puzzle" }, { status: 404 })
    }

    // Get user's guess for this puzzle
    const { data: guess, error: guessError } = await supabase
      .from("retitled_guesses")
      .select("*")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .single()

    if (guessError || !guess) {
      return NextResponse.json({ error: "No guess found for this puzzle" }, { status: 404 })
    }

    // Get user stats
    const { data: stats } = await supabase
      .from("retitled_user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    // Get the correct movie data from TMDB
    const correctMovie = await getMovieById(puzzle.film_id)
    
    if (!correctMovie) {
      return NextResponse.json({ error: "Failed to get movie data" }, { status: 500 })
    }

    return NextResponse.json({
      correct: guess.is_correct,
      solveTimeMs: guess.solve_time_ms,
      correctAnswer: {
        id: puzzle.film_id,
        title: correctMovie.title,
        originalTitle: correctMovie.original_title,
        releaseYear: getReleaseYear(correctMovie.release_date),
        translationNote: puzzle.translation_note,
        posterPath: correctMovie.poster_path
      },
      puzzle: {
        localizedTitle: puzzle.localized_title,
        englishTranslation: puzzle.english_translation || '',
        countryCode: puzzle.country_code,
        flagEmoji: getCountryFlag(puzzle.country_code)
      },
      stats: {
        gamesPlayed: stats?.games_played || 1,
        accuracy: stats?.games_played > 0 
          ? Math.round((stats.games_correct / stats.games_played) * 100 * 10) / 10
          : 0,
        currentStreak: stats?.current_streak || 0
      }
    })
  } catch (error) {
    console.error("Error in result API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 