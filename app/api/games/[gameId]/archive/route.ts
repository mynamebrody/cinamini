import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getGameLaunchDate, type GameId } from "@/lib/puzzle-numbering"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    
    // Validate game ID
    const validGameIds: GameId[] = ['retitled', 'budget-bracket', 'cast-climb', 'poster-pixels']
    if (!validGameIds.includes(gameId as GameId)) {
      return NextResponse.json(
        { error: "Invalid game ID" },
        { status: 400 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate parameters are required" },
        { status: 400 }
      )
    }
    
    // Parse and validate dates
    const start = new Date(startDate + 'T00:00:00Z')
    const end = new Date(endDate + 'T23:59:59Z')
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
    }
    
    if (start > end) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      )
    }
    
    // Get user client for checking play history
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get launch date for the game
    const launchDate = await getGameLaunchDate(serviceSupabase, gameId as GameId)
    
    // Get the appropriate puzzle table and columns based on game
    const puzzleTableConfig = {
      'retitled': {
        table: 'retitled_puzzles',
        guessTable: 'retitled_guesses',
        dateColumn: 'puzzle_date'
      },
      'budget-bracket': {
        table: 'budget_bracket_puzzles',
        guessTable: 'budget_bracket_games',
        dateColumn: 'puzzle_date'
      },
      'cast-climb': {
        table: 'cast_climb_puzzles',
        guessTable: 'cast_climb_guesses',
        dateColumn: 'puzzle_date'
      },
      'poster-pixels': {
        table: 'poster_pixels_puzzles',
        guessTable: 'poster_pixels_games',
        dateColumn: 'puzzle_date'
      }
    }
    
    const config = puzzleTableConfig[gameId as GameId]
    
    // Get all existing puzzles in the date range
    const { data: puzzles, error: puzzlesError } = await serviceSupabase
      .from(config.table)
      .select('id, puzzle_date')
      .gte(config.dateColumn, start.toISOString().split('T')[0])
      .lte(config.dateColumn, end.toISOString().split('T')[0])
      .order(config.dateColumn, { ascending: true })
    
    if (puzzlesError) {
      console.error('Error fetching puzzles:', puzzlesError)
      return NextResponse.json(
        { error: "Failed to fetch puzzle data" },
        { status: 500 }
      )
    }
    
    // Create a map of existing puzzles
    const puzzleMap = new Map<string, string>()
    puzzles?.forEach(puzzle => {
      puzzleMap.set(puzzle.puzzle_date, puzzle.id)
    })
    
    // Get user's play history if logged in
    const playedDates = new Set<string>()
    if (user) {
      let userGames: any[] = []
      
      if (gameId === 'retitled') {
        const { data } = await supabase
          .from('retitled_guesses')
          .select('puzzle_id')
          .eq('user_id', user.id)
        userGames = data || []
      } else if (gameId === 'budget-bracket') {
        const { data } = await supabase
          .from('budget_bracket_games')
          .select('puzzle_id')
          .eq('user_id', user.id)
        userGames = data || []
      } else if (gameId === 'cast-climb') {
        const { data } = await supabase
          .from('cast_climb_guesses')
          .select('puzzle_id')
          .eq('user_id', user.id)
        userGames = data || []
        // For Cast Climb, get unique puzzle IDs
        const uniquePuzzleIds = new Set(userGames.map(g => g.puzzle_id))
        userGames = Array.from(uniquePuzzleIds).map(id => ({ puzzle_id: id }))
      } else if (gameId === 'poster-pixels') {
        const { data } = await supabase
          .from('poster_pixels_games')
          .select('puzzle_id')
          .eq('user_id', user.id)
        userGames = data || []
      }
      
      // Get the dates for these puzzles
      if (userGames.length > 0) {
        const puzzleIds = userGames.map(g => g.puzzle_id)
        const { data: playedPuzzles } = await serviceSupabase
          .from(config.table)
          .select('puzzle_date')
          .in('id', puzzleIds)
        
        playedPuzzles?.forEach(puzzle => {
          playedDates.add(puzzle.puzzle_date)
        })
      }
    }
    
    // Generate response for each date in range
    const dateInfo = []
    const current = new Date(start)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const hasPuzzle = puzzleMap.has(dateStr)
      const hasPlayed = playedDates.has(dateStr)
      const isBeforeLaunch = current < launchDate
      const isFuture = current > today
      
      dateInfo.push({
        date: dateStr,
        hasPuzzle,
        hasPlayed,
        isAvailable: hasPuzzle && !isBeforeLaunch && !isFuture
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return NextResponse.json({
      gameId,
      launchDate: launchDate.toISOString().split('T')[0],
      dates: dateInfo
    })
  } catch (error) {
    console.error('Error in archive endpoint:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}