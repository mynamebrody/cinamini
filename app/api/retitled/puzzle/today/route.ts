import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Hardcoded movie options for MVP
const MOVIE_OPTIONS = [
  { id: 562, title: "Die Hard" },
  { id: 679, title: "Aliens" },
  { id: 78, title: "Blade Runner" },
  { id: 280, title: "The Terminator" }
]

// Country flag emojis mapping
const FLAG_EMOJIS: Record<string, string> = {
  'FR': '🇫🇷',
  'ES': '🇪🇸',
  'DE': '🇩🇪',
  'IT': '🇮🇹',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'CN': '🇨🇳',
  'BR': '🇧🇷',
  'RU': '🇷🇺',
  'IN': '🇮🇳'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get today's puzzle
    const today = new Date().toISOString().split('T')[0]
    const { data: puzzle, error: puzzleError } = await supabase
      .from("retitled_puzzles")
      .select("*")
      .eq("puzzle_date", today)
      .single()

    if (puzzleError || !puzzle) {
      console.error("Error fetching puzzle:", puzzleError)
      return NextResponse.json({ error: "No puzzle available today" }, { status: 404 })
    }

    // Check if user has already played today
    const { data: userGuess, error: guessError } = await supabase
      .from("retitled_guesses")
      .select("*")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
      .single()

    // Build the options array
    const options = MOVIE_OPTIONS.filter(movie => 
      movie.id === puzzle.film_id || puzzle.distractor_ids.includes(movie.id)
    )

    // Shuffle options for better UX
    const shuffledOptions = [...options].sort(() => Math.random() - 0.5)

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        localizedTitle: puzzle.localized_title,
        countryCode: puzzle.country_code,
        countryName: puzzle.country_name,
        flagEmoji: FLAG_EMOJIS[puzzle.country_code] || '🏳️',
        options: shuffledOptions
      },
      hasPlayed: !!userGuess,
      userGuess: userGuess ? {
        guessFilmId: userGuess.guess_film_id,
        isCorrect: userGuess.is_correct,
        solveTimeMs: userGuess.solve_time_ms
      } : null
    })
  } catch (error) {
    console.error("Error in today's puzzle API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}