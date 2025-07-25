import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { puzzleId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const puzzleId = params.puzzleId

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
      .select("is_correct, guess_film_id")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .single()

    if (guessError || !guess) {
      return NextResponse.json({ error: "No guess found for this puzzle" }, { status: 404 })
    }

    // Calculate puzzle number (days since launch)
    const launchDate = new Date('2024-01-01') // Arbitrary launch date
    const puzzleDate = new Date(puzzle.puzzle_date)
    const daysDiff = Math.floor((puzzleDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24))
    const puzzleNumber = daysDiff + 1

    // Get flag emoji
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
    const flagEmoji = FLAG_EMOJIS[puzzle.country_code] || '🏳️'

    // Generate result grid (simplified for single guess)
    const resultGrid = guess.is_correct ? '🟩⬜⬜⬜' : '🟥⬜⬜⬜'

    // Generate share text
    const shareText = `CinaMini Retitle #${puzzleNumber} ${flagEmoji}\n${resultGrid}\nCinaMini.app`
    const shareUrl = `https://CinaMini.app/retitled/${puzzleNumber}`

    return NextResponse.json({
      shareText,
      shareUrl
    })
  } catch (error) {
    console.error("Error in share API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}