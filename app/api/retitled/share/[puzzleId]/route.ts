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
        shareText: `Retitled #${puzzleNumber} ${flagEmoji} 🎬\n1/1 rounds • 0s • #cinamini\n\nhttps://cinamini.app/game/retitled`,
        shareUrl: `https://cinamini.app/game/retitled`
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

    // Get user's guess for this puzzle - add guess.solve_time_ms to query  
    const { data: guess, error: guessError } = await supabase
      .from("retitled_guesses")
      .select(`
        is_correct,
        guess_film_id,
        solve_time_ms
      `)
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
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

    // Calculate time in seconds
    const totalSeconds = guess.solve_time_ms ? Math.round(guess.solve_time_ms / 1000) : 0

    // Generate share text
    let shareText = ''
    if (guess.is_correct) {
      shareText = 'Perfect Producer!\n\n'
    }
    
    shareText += `Retitled #${puzzleNumber} ${flagEmoji} ${resultGrid}\n`
    shareText += `1/1 rounds • ${totalSeconds}s • #cinamini\n\n`
    shareText += `https://cinamini.app/game/retitled`
    
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