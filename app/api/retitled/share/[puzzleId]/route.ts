import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCountryFlag } from "@/lib/flag-emojis"
import { calculatePuzzleNumberFromLaunch } from "@/lib/puzzle-numbering"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // For anonymous users, get basic puzzle info for share text
      const { puzzleId } = await params
      const { data: puzzle } = await supabase
        .from("retitled_puzzles")
        .select("puzzle_date, country_code")
        .eq("id", puzzleId)
        .single()
        
      const puzzleNumber = puzzle?.puzzle_date ? await calculatePuzzleNumberFromLaunch(supabase, 'retitled', new Date(puzzle.puzzle_date)) : "???"
      const flagEmoji = getCountryFlag(puzzle?.country_code || "US")
      
      return NextResponse.json({
        shareText: `Retitled #${puzzleNumber} ${flagEmoji} 🎬`,
        shareUrl: `https://cinamini.app/game/retitled`
      })
    }

    const { puzzleId } = await params

    // Get the puzzle info
    const { data: puzzle, error: puzzleError } = await supabase
      .from("retitled_puzzles")
      .select("puzzle_date, country_code")
      .eq("id", puzzleId)
      .single()

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: "Invalid puzzle" }, { status: 404 })
    }

    // Get user's guess for this puzzle
    const { data: guess, error: guessError } = await supabase
      .from("retitled_guesses")
      .select("is_correct, guess_film_id, solve_time_ms")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .single()

    if (guessError || !guess) {
      return NextResponse.json({ error: "No guess found for this puzzle" }, { status: 404 })
    }

    // Use puzzle number from database
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
    const shareText = `Retitled #${puzzleNumber} ${flagEmoji} ${resultEmoji} • ${timeText}`
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