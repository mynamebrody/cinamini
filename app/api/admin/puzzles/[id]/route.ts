import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')
    const { id: puzzleId } = await params
    
    if (!puzzleId || !gameType) {
      return NextResponse.json(
        { error: "Puzzle ID and game type are required" },
        { status: 400 }
      )
    }

    // Validate game type
    const supportedGameTypes = ['retitled', 'budget_bracket', 'poster_pixels', 'cast_climb']
    if (!supportedGameTypes.includes(gameType)) {
      return NextResponse.json(
        { error: `Unsupported game type: ${gameType}` },
        { status: 400 }
      )
    }

    // Verify user is authenticated and is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Use service role client to fetch puzzle
    const serviceSupabase = await createServiceClient()
    
    const tableName = `${gameType}_puzzles`
    const { data, error } = await serviceSupabase
      .from(tableName)
      .select('*')
      .eq('id', puzzleId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: "Puzzle not found" },
          { status: 404 }
        )
      }
      console.error(`Error fetching ${gameType} puzzle:`, error)
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      puzzle: { ...data, game_type: gameType }
    })
  } catch (error) {
    console.error('Error fetching puzzle:', error)
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    )
  }
}