import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { puzzleId, gameType, puzzleData } = body
    
    if (!puzzleId || !gameType || !puzzleData) {
      return NextResponse.json(
        { error: "Puzzle ID, game type, and puzzle data are required" },
        { status: 400 }
      )
    }

    // Validate supported game types
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

    // Use service role client to bypass RLS
    const serviceSupabase = await createServiceClient()
    
    // First, get the existing puzzle to check if it's been played
    const tableName = `${gameType}_puzzles`
    const { data: existingPuzzle, error: fetchError } = await serviceSupabase
      .from(tableName)
      .select('*')
      .eq('id', puzzleId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Puzzle not found" },
          { status: 404 }
        )
      }
      console.error('Error fetching existing puzzle:', fetchError)
      return NextResponse.json(
        { error: "Failed to fetch existing puzzle" },
        { status: 500 }
      )
    }

    // Check if puzzle has been played (has guesses)
    let hasBeenPlayed = false
    let isLivePuzzle = false
    
    if (existingPuzzle.puzzle_date && existingPuzzle.is_published) {
      const puzzleDate = new Date(existingPuzzle.puzzle_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Check if puzzle date is today or in the past
      if (puzzleDate <= today) {
        isLivePuzzle = true
        
        // Check if there are any guesses for this puzzle
        const guessTableMap = {
          'retitled': 'retitled_guesses',
          'budget_bracket': 'budget_bracket_games',
          'cast_climb': 'cast_climb_guesses',
          'poster_pixels': 'poster_pixels_guesses'
        }
        
        const guessTable = guessTableMap[gameType as keyof typeof guessTableMap]
        const { data: guesses } = await serviceSupabase
          .from(guessTable)
          .select('id')
          .eq('puzzle_id', puzzleId)
          .limit(1)
        
        hasBeenPlayed = (guesses && guesses.length > 0) || false
      }
    }

    // Return warning information if this is a live or played puzzle
    const warningInfo = {
      isLivePuzzle,
      hasBeenPlayed,
      puzzleDate: existingPuzzle.puzzle_date,
      isPublished: existingPuzzle.is_published
    }

    // Before update, prevent duplicate film usage for specific games if film_id is changing or present
    if (['retitled', 'poster_pixels', 'cast_climb'].includes(gameType) && typeof puzzleData?.film_id !== 'undefined') {
      const filmId = puzzleData.film_id
      if (typeof filmId !== 'number') {
        return NextResponse.json(
          { error: 'film_id must be a number' },
          { status: 400 }
        )
      }
      const { data: dup, error: dupError } = await serviceSupabase
        .from(tableName)
        .select('id')
        .eq('film_id', filmId)
        .neq('id', puzzleId)
        .limit(1)
      if (dupError) {
        console.error('Duplicate check failed:', dupError)
        return NextResponse.json(
          { error: 'Failed to validate puzzle uniqueness' },
          { status: 500 }
        )
      }
      if (dup && dup.length > 0) {
        return NextResponse.json(
          { error: 'A puzzle for this movie already exists for this game.' },
          { status: 409 }
        )
      }
    }

    // Remove fields that shouldn't be updated
    const updateData = { ...puzzleData }
    delete updateData.id
    delete updateData.created_at

    // Update the puzzle
    const { data, error } = await serviceSupabase
      .from(tableName)
      .update(updateData)
      .eq('id', puzzleId)
      .select()
      .single()

    if (error) {
      console.error(`Error updating ${gameType} puzzle:`, error)
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
      puzzle: data,
      warnings: warningInfo
    })
  } catch (error) {
    console.error('Error updating puzzle:', error)
    return NextResponse.json(
      { error: "Failed to update puzzle" },
      { status: 500 }
    )
  }
}
