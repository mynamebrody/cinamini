import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCountryFlag } from "@/lib/flag-emojis"
import { calculatePuzzleNumberFromLaunch } from "@/lib/puzzle-numbering"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get today's puzzle - this is likely what's needed when puzzleId is missing
    const today = new Date().toISOString().split('T')[0]
    
    const { data: puzzle, error: puzzleError } = await supabase
      .from("retitled_puzzles")
      .select("id, puzzle_date, country_code")
      .eq("puzzle_date", today)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: "No puzzle found for today" }, { status: 404 })
    }

    // Get user's guess for this puzzle
    const { data: guess, error: guessError } = await supabase
      .from("retitled_guesses")
      .select("is_correct, guess_film_id, solve_time_ms")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
      .single()

    if (guessError || !guess) {
      return NextResponse.json({ error: "No guess found for this puzzle" }, { status: 404 })
    }

    // Calculate puzzle number from launch date
    const puzzleNumber = await calculatePuzzleNumberFromLaunch(supabase, 'retitled', new Date(puzzle.puzzle_date))

    // Get flag emoji
    const flagEmoji = getCountryFlag(puzzle.country_code)

    // Generate result emoji
    const resultEmoji = guess.is_correct ? '✅' : '❌'
    
    // Format solve time
    const solveTimeMs = guess.solve_time_ms || 0
    const solveTimeSeconds = Math.round(solveTimeMs / 1000)
    const timeText = `${solveTimeSeconds}s`

    // Generate share text
    const shareText = `Retitled #${puzzleNumber} ${flagEmoji} • ${resultEmoji} • ${timeText}`
    const shareUrl = `https://cinamini.app/game/retitled`

    return NextResponse.json({
      shareText,
      shareUrl
    })
  } catch (error) {
    console.error("Error in share API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}