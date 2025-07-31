import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { puzzleId, gameType, newDate } = body
    
    if (!puzzleId || !gameType) {
      return NextResponse.json(
        { error: "Puzzle ID and game type are required" },
        { status: 400 }
      )
    }

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

    const serviceSupabase = await createServiceClient()

    // Check if there's already a puzzle on the new date
    if (newDate) {
      const tableName = `${gameType}_puzzles`
      const { data: existingPuzzle } = await serviceSupabase
        .from(tableName)
        .select('id')
        .eq('puzzle_date', newDate)
        .single()

      if (existingPuzzle) {
        return NextResponse.json(
          { error: "A puzzle already exists on that date for this game" },
          { status: 409 }
        )
      }
    }

    // Update the puzzle date
    const tableName = `${gameType}_puzzles`
    const { data, error } = await serviceSupabase
      .from(tableName)
      .update({ puzzle_date: newDate })
      .eq('id', puzzleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating puzzle date:', error)
      return NextResponse.json(
        { error: "Failed to update puzzle date" },
        { status: 500 }
      )
    }

    return NextResponse.json({ puzzle: data })
  } catch (error) {
    console.error('Error rescheduling puzzle:', error)
    return NextResponse.json(
      { error: "Failed to reschedule puzzle" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const puzzleId = searchParams.get('puzzleId')
    const gameType = searchParams.get('gameType')
    
    if (!puzzleId || !gameType) {
      return NextResponse.json(
        { error: "Puzzle ID and game type are required" },
        { status: 400 }
      )
    }

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

    const serviceSupabase = await createServiceClient()

    // Remove the puzzle date (convert to draft)
    const tableName = `${gameType}_puzzles`
    const { error } = await serviceSupabase
      .from(tableName)
      .update({ puzzle_date: null })
      .eq('id', puzzleId)

    if (error) {
      console.error('Error converting puzzle to draft:', error)
      return NextResponse.json(
        { error: "Failed to convert puzzle to draft" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error converting puzzle to draft:', error)
    return NextResponse.json(
      { error: "Failed to convert puzzle to draft" },
      { status: 500 }
    )
  }
}