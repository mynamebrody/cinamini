import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCountryFlag } from "@/lib/retitled"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user (optional for anonymous support)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user) {
      // For anonymous users, get basic puzzle info for share text
      const { puzzleId } = await params
      const { data: puzzle } = await supabase
        .from("retitled_puzzles")
        .select("puzzle_number, country_code")
        .eq("id", puzzleId)
        .single()
        
      const puzzleNumber = puzzle?.puzzle_number || "???"
      const flagEmoji = getCountryFlag(puzzle?.country_code || "US")
      
      return NextResponse.json({
        shareText: `Retitled ${flagEmoji} #${puzzleNumber} 🎬`,
      })
    }

    const { puzzleId } = await params

    // Get the puzzle info
    const { data: puzzle, error: puzzleError } = await supabase
      .from("retitled_puzzles")
      .select("puzzle_date, country_code, puzzle_number")
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

    // Use puzzle number from database
    const puzzleNumber = puzzle.puzzle_number || 1

    // Get flag emoji
    const FLAG_EMOJIS: Record<string, string> = {
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'FR': '🇫🇷',
      'ES': '🇪🇸',
      'DE': '🇩🇪',
      'DK': '🇩🇰',
      'IT': '🇮🇹',
      'JP': '🇯🇵',
      'KR': '🇰🇷',
      'CN': '🇨🇳',
      'BR': '🇧🇷',
      'RU': '🇷🇺',
      'IN': '🇮🇳',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
      'MX': '🇲🇽',
      'AR': '🇦🇷',
      'SE': '🇸🇪',
      'FI': '🇫🇮',
      'NO': '🇳🇴',
      'NL': '🇳🇱',
      'BE': '🇧🇪',
      'CH': '🇨🇭',
      'PL': '🇵🇱',
      'TR': '🇹🇷',
      'GR': '🇬🇷',
      'PT': '🇵🇹',
      'IE': '🇮🇪',
      'IL': '🇮🇱',
      'EG': '🇪🇬',
      'ZA': '🇿🇦',
      'NZ': '🇳🇿',
      'HU': '🇭🇺',
      'CZ': '🇨🇿',
      'AT': '🇦🇹',
      'TH': '🇹🇭',
      'ID': '🇮🇩',
      'PH': '🇵🇭',
      'SG': '🇸🇬',
      'MY': '🇲🇾',
      'RO': '🇷🇴',
      'BG': '🇧🇬',
      'UA': '🇺🇦',
      'SK': '🇸🇰',
      'HR': '🇭🇷',
      'RS': '🇷🇸',
      'SA': '🇸🇦',
      'AE': '🇦🇪',
      'CL': '🇨🇱',
      'CO': '🇨🇴',
      'PE': '🇵🇪',
      'VE': '🇻🇪',
      'PK': '🇵🇰',
      'BD': '🇧🇩',
      'VN': '🇻🇳',
      'TW': '🇹🇼',
      'HK': '🇭🇰',
      'LU': '🇱🇺',
      'IS': '🇮🇸',
      'EE': '🇪🇪',
      'LT': '🇱🇹',
      'LV': '🇱🇻',
      'SI': '🇸🇮',
      'MT': '🇲🇹',
      'CY': '🇨🇾',
      'MA': '🇲🇦',
      'TN': '🇹🇳',
      'DZ': '🇩🇿',
      'NG': '🇳🇬',
      'KE': '🇰🇪',
      'GH': '🇬🇭',
      'SN': '🇸🇳',
      'CI': '🇨🇮',
      'CM': '🇨🇲',
      'ET': '🇪🇹',
      'SD': '🇸🇩',
      'IR': '🇮🇷',
      'IQ': '🇮🇶',
      'SY': '🇸🇾',
      'JO': '🇯🇴',
      'LB': '🇱🇧',
      'QA': '🇶🇦',
      'KW': '🇰🇼',
      'OM': '🇴🇲',
      'BH': '🇧🇭',
      'AZ': '🇦🇿',
      'GE': '🇬🇪',
      'AM': '🇦🇲',
      'KZ': '🇰🇿',
      'UZ': '🇺🇿',
      'KG': '🇰🇬',
      'TJ': '🇹🇯',
      'TM': '🇹🇲',
      'AF': '🇦🇫',
      'NP': '🇳🇵',
      'LK': '🇱🇰',
      'MM': '🇲🇲',
      'KH': '🇰🇭',
      'LA': '🇱🇦',
      'MN': '🇲🇳',
      'MO': '🇲🇴',
      'PA': '🇵🇦',
      'CR': '🇨🇷',
      'CU': '🇨🇺',
      'DO': '🇩🇴',
      'EC': '🇪🇨',
      'GT': '🇬🇹',
      'HN': '🇭🇳',
      'JM': '🇯🇲',
      'NI': '🇳🇮',
      'PY': '🇵🇾',
      'SV': '🇸🇻',
      'UY': '🇺🇾',
      'BO': '🇧🇴',
      'BA': '🇧🇦',
      'ME': '🇲🇪',
      'MK': '🇲🇰',
      'AL': '🇦🇱',
      'MD': '🇲🇩',
      'BY': '🇧🇾',
      'LT': '🇱🇹',
      'LV': '🇱🇻',
      'EE': '🇪🇪',
      'MC': '🇲🇨',
      'LI': '🇱🇮',
      'SM': '🇸🇲',
      'VA': '🇻🇦',
      'AD': '🇦🇩',
      'FO': '🇫🇴',
      'GL': '🇬🇱',
      'GI': '🇬🇮',
      'GG': '🇬🇬',
      'JE': '🇯🇪',
      'IM': '🇮🇲',
      'AX': '🇦🇽',
    }
    const flagEmoji = FLAG_EMOJIS[puzzle.country_code] || '🏳️'

    // Generate result grid (simplified for single guess)
    const resultGrid = guess.is_correct ? '✅' : '❌'

    // Generate share text
    const shareText = `Retitled #${puzzleNumber} ${flagEmoji}\n${resultGrid}\nhttps://cinamini.app`
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