import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface ScheduleAssignment {
  puzzleId: string
  gameType: string
  targetDate: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { assignments }: { assignments: ScheduleAssignment[] } = body
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "Assignments array is required" },
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
    
    // Process assignments in batches to avoid conflicts
    const results = []
    const errors = []
    
    for (const assignment of assignments) {
      const { puzzleId, gameType, targetDate } = assignment
      
      try {
        // Validate game type
        const validGameTypes = ['retitled', 'budget_bracket', 'cast_climb', 'poster_pixels']
        if (!validGameTypes.includes(gameType)) {
          throw new Error(`Invalid game type: ${gameType}`)
        }
        
        const tableName = `${gameType}_puzzles`

        // Budget Bracket uses 'name' field (optional), other games use 'film_title'
        const titleField = gameType === 'budget_bracket' ? 'name' : 'film_title'

        // Check if there's already a puzzle on this date for this game type
        const { data: existingPuzzle } = await serviceSupabase
          .from(tableName)
          .select(`id, ${titleField}`)
          .eq('puzzle_date', targetDate)
          .single()

        if (existingPuzzle) {
          const title = existingPuzzle[titleField] || 'Untitled'
          throw new Error(`${gameType} puzzle already exists on ${targetDate}: ${title}`)
        }

        // Update the puzzle with the new date
        const { data: updatedPuzzle, error: updateError } = await serviceSupabase
          .from(tableName)
          .update({ puzzle_date: targetDate })
          .eq('id', puzzleId)
          .select(`id, ${titleField}, puzzle_date`)
          .single()

        if (updateError) {
          throw new Error(`Failed to update puzzle ${puzzleId}: ${updateError.message}`)
        }

        results.push({
          puzzleId,
          gameType,
          targetDate,
          filmTitle: updatedPuzzle[titleField] || 'Untitled',
          success: true
        })
        
      } catch (error) {
        console.error(`Error processing assignment ${puzzleId}:`, error)
        errors.push({
          puzzleId,
          gameType,
          targetDate,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }
    
    const successCount = results.length
    const errorCount = errors.length
    
    return NextResponse.json({
      success: errorCount === 0,
      message: errorCount === 0 
        ? `Successfully scheduled ${successCount} puzzles`
        : `Scheduled ${successCount} puzzles, ${errorCount} failed`,
      results,
      errors,
      stats: {
        total: assignments.length,
        successful: successCount,
        failed: errorCount
      }
    })

  } catch (error) {
    console.error("Error in auto-schedule API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}