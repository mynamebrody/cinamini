import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMovieById, getReleaseYear } from "@/lib/tmdb"
import { getCountryFlag } from "@/lib/retitled"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (authentication is optional for anonymous support)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user) {
      // For anonymous users, we can't save guesses but we can validate and return results
      const { puzzleId, guessFilmId } = await request.json()
      
      if (!puzzleId || !guessFilmId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      // Get the puzzle to check the correct answer
      const { data: puzzle, error: puzzleError } = await supabase
        .from("retitled_puzzles")
        .select("*")
        .eq("id", puzzleId)
        .single()

      if (puzzleError || !puzzle) {
        return NextResponse.json({ error: "Invalid puzzle" }, { status: 404 })
      }

      // Determine if guess is correct
      const isCorrect = guessFilmId === puzzle.film_id

      // Get the correct movie data from TMDB
      const correctMovie = await getMovieById(puzzle.film_id)
      
      if (!correctMovie) {
        return NextResponse.json({ error: "Failed to get movie data" }, { status: 500 })
      }

      return NextResponse.json({
        correct: isCorrect,
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
          flagEmoji: getCountryFlag(puzzle.country_code),
          puzzleNumber: puzzle.puzzle_number
        },
        stats: {
          gamesPlayed: 1,
          accuracy: isCorrect ? 100 : 0,
          currentStreak: isCorrect ? 1 : 0
        },
        anonymous: true
      })
    }

    // Parse request body
    const { puzzleId, guessFilmId, solveTimeMs } = await request.json()
    
    if (!puzzleId || !guessFilmId || solveTimeMs === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the puzzle to check the correct answer
    const { data: puzzle, error: puzzleError } = await supabase
      .from("retitled_puzzles")
      .select("*")
      .eq("id", puzzleId)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: "Invalid puzzle" }, { status: 404 })
    }

    // Check if user has already played this puzzle
    const { data: existingGuess } = await supabase
      .from("retitled_guesses")
      .select("id, is_correct")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .single()

    if (existingGuess) {
      // If user has already played, return their existing result instead of error
      const isCorrect = existingGuess.is_correct
      
      // Get the correct movie data from TMDB
      const correctMovie = await getMovieById(puzzle.film_id)
      
      if (!correctMovie) {
        return NextResponse.json({ error: "Failed to get movie data" }, { status: 500 })
      }

      // Get current stats
      const { data: currentStats } = await supabase
        .from("retitled_user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single()

      return NextResponse.json({
        correct: isCorrect,
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
          flagEmoji: getCountryFlag(puzzle.country_code),
          puzzleNumber: puzzle.puzzle_number
        },
        stats: {
          gamesPlayed: currentStats?.games_played || 0,
          accuracy: currentStats?.games_played > 0 
            ? Math.round((currentStats.games_correct / currentStats.games_played) * 100 * 10) / 10
            : 0,
          currentStreak: currentStats?.current_streak || 0
        },
        alreadyPlayed: true
      })
    }

    // Determine if guess is correct
    const isCorrect = guessFilmId === puzzle.film_id

    // Insert the guess
    const { error: insertError } = await supabase
      .from("retitled_guesses")
      .insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        guess_film_id: guessFilmId,
        is_correct: isCorrect,
        solve_time_ms: solveTimeMs,
        attempt_number: 1
      })

    if (insertError) {
      console.error("Error inserting guess:", insertError)
      return NextResponse.json({ error: "Failed to save guess" }, { status: 500 })
    }

    // Update user stats
    const { data: currentStats } = await supabase
      .from("retitled_user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let newStats = {
      games_played: 1,
      games_correct: isCorrect ? 1 : 0,
      current_streak: isCorrect ? 1 : 0,
      longest_streak: isCorrect ? 1 : 0,
      average_solve_time_ms: solveTimeMs,
      countries_guessed: isCorrect ? [puzzle.country_code] : [],
      last_played_date: today
    }

    if (currentStats) {
      // Update existing stats
      const wasYesterday = currentStats.last_played_date === yesterday
      const continueStreak = isCorrect && wasYesterday
      const newCurrentStreak = continueStreak ? currentStats.current_streak + 1 : (isCorrect ? 1 : 0)
      
      newStats = {
        games_played: currentStats.games_played + 1,
        games_correct: currentStats.games_correct + (isCorrect ? 1 : 0),
        current_streak: newCurrentStreak,
        longest_streak: Math.max(currentStats.longest_streak, newCurrentStreak),
        average_solve_time_ms: Math.round(
          (currentStats.average_solve_time_ms * currentStats.games_played + solveTimeMs) / 
          (currentStats.games_played + 1)
        ),
        countries_guessed: isCorrect && !currentStats.countries_guessed.includes(puzzle.country_code)
          ? [...currentStats.countries_guessed, puzzle.country_code]
          : currentStats.countries_guessed,
        last_played_date: today
      }

      await supabase
        .from("retitled_user_stats")
        .update(newStats)
        .eq("user_id", user.id)
    } else {
      // Insert new stats
      await supabase
        .from("retitled_user_stats")
        .insert({
          user_id: user.id,
          ...newStats
        })
    }

    // Get the correct movie data from TMDB
    const correctMovie = await getMovieById(puzzle.film_id)
    
    if (!correctMovie) {
      return NextResponse.json({ error: "Failed to get movie data" }, { status: 500 })
    }

    return NextResponse.json({
      correct: isCorrect,
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
        flagEmoji: getCountryFlag(puzzle.country_code),
        puzzleNumber: puzzle.puzzle_number
      },
      stats: {
        gamesPlayed: newStats.games_played,
        accuracy: newStats.games_played > 0 
          ? Math.round((newStats.games_correct / newStats.games_played) * 100 * 10) / 10
          : 0,
        currentStreak: newStats.current_streak
      }
    })
  } catch (error) {
    console.error("Error in guess API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}