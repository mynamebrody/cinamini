import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { schedules } = body // Array of { puzzleId, gameType, date }
    
    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "Schedules array is required" },
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
    const results = []
    const errors = []

    // Process each schedule update
    for (const schedule of schedules) {
      const { puzzleId, gameType, date } = schedule
      
      // Check if there's already a puzzle on that date
      if (date) {
        const tableName = `${gameType}_puzzles`
        const { data: existingPuzzle } = await serviceSupabase
          .from(tableName)
          .select('id')
          .eq('puzzle_date', date)
          .neq('id', puzzleId)
          .single()

        if (existingPuzzle) {
          errors.push({
            puzzleId,
            error: `A puzzle already exists on ${date} for ${gameType}`
          })
          continue
        }
      }

      // Update the puzzle
      const tableName = `${gameType}_puzzles`
      const { data, error } = await serviceSupabase
        .from(tableName)
        .update({ puzzle_date: date })
        .eq('id', puzzleId)
        .select()
        .single()

      if (error) {
        errors.push({ puzzleId, error: error.message })
      } else {
        results.push(data)
      }
    }

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors
    })
  } catch (error) {
    console.error('Error in bulk schedule:', error)
    return NextResponse.json(
      { error: "Failed to bulk schedule puzzles" },
      { status: 500 }
    )
  }
}