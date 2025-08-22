import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { puzzleId, gameType, newDate, isDraftSwap, existingPuzzleId } = body
    
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
    let existingPuzzle = null
    let swapPuzzle = false
    
    if (newDate) {
      const tableName = `${gameType}_puzzles`
      // Select appropriate columns based on game type
      const columns = gameType === 'budget_bracket' 
        ? 'id, puzzle_date, name, pairs'
        : 'id, puzzle_date, film_title'
      
      const { data: existing } = await serviceSupabase
        .from(tableName)
        .select(columns)
        .eq('puzzle_date', newDate)
        .single()

      if (existing) {
        existingPuzzle = existing
        swapPuzzle = true
      }
    }

    // Get the current puzzle details first
    const tableName = `${gameType}_puzzles`
    // Select appropriate columns based on game type
    const columns = gameType === 'budget_bracket' 
      ? 'id, puzzle_date, name, pairs'
      : 'id, puzzle_date, film_title'
    
    const { data: currentPuzzle, error: fetchError } = await serviceSupabase
      .from(tableName)
      .select(columns)
      .eq('id', puzzleId)
      .single()

    if (fetchError) {
      console.error('Error fetching current puzzle:', fetchError)
      return NextResponse.json(
        { error: "Failed to fetch current puzzle" },
        { status: 500 }
      )
    }

    if (swapPuzzle && existingPuzzle) {
      // Check if this is a draft swap (dragging unpublished puzzle to published one)
      if (isDraftSwap && existingPuzzleId) {
        // For draft swaps: set existing puzzle to draft (null date), set dragged puzzle to target date
        const tempDate = `9999-12-31` // Temporary date that won't conflict
        
        // Step 1: Move existing puzzle to temporary date
        const { error: tempError } = await serviceSupabase
          .from(tableName)
          .update({ puzzle_date: tempDate })
          .eq('id', existingPuzzleId)

        if (tempError) {
          console.error('Error moving existing puzzle to temp date:', tempError)
          return NextResponse.json(
            { error: "Failed to swap puzzles - temp move failed" },
            { status: 500 }
          )
        }

        // Step 2: Move draft puzzle to the target date and publish it
        const { error: updateError1 } = await serviceSupabase
          .from(tableName)
          .update({ 
            puzzle_date: newDate,
            is_published: true 
          })
          .eq('id', puzzleId)

        if (updateError1) {
          console.error('Error updating draft puzzle:', updateError1)
          // Rollback: move existing puzzle back to original date
          await serviceSupabase
            .from(tableName)
            .update({ puzzle_date: newDate })
            .eq('id', existingPuzzleId)
          
          return NextResponse.json(
            { error: "Failed to swap puzzles - draft publication failed" },
            { status: 500 }
          )
        }

        // Step 3: Move existing puzzle to draft (null date) and unpublish it
        const { error: updateError2 } = await serviceSupabase
          .from(tableName)
          .update({ 
            puzzle_date: null,
            is_published: false 
          })
          .eq('id', existingPuzzleId)

        if (updateError2) {
          console.error('Error updating existing puzzle to draft:', updateError2)
          // Rollback both moves
          await serviceSupabase
            .from(tableName)
            .update({ 
              puzzle_date: null,
              is_published: false 
            })
            .eq('id', puzzleId)
          
          await serviceSupabase
            .from(tableName)
            .update({ puzzle_date: newDate })
            .eq('id', existingPuzzleId)
          
          return NextResponse.json(
            { error: "Failed to swap puzzles - existing puzzle draft conversion failed" },
            { status: 500 }
          )
        }

        return NextResponse.json({ 
          swapped: true,
          draftSwap: true,
          puzzle1: { ...currentPuzzle, puzzle_date: newDate, is_published: true },
          puzzle2: { ...existingPuzzle, puzzle_date: null, is_published: false }
        })
      } else {
        // Normal swap between two published puzzles
        const currentDate = currentPuzzle.puzzle_date
        const tempDate = `9999-12-31` // Temporary date that won't conflict
        
        // Step 1: Move existing puzzle to temporary date
        const { error: tempError } = await serviceSupabase
          .from(tableName)
          .update({ puzzle_date: tempDate })
          .eq('id', existingPuzzle.id)

        if (tempError) {
          console.error('Error moving puzzle to temp date:', tempError)
          return NextResponse.json(
            { error: "Failed to swap puzzles - temp move failed" },
            { status: 500 }
          )
        }

        // Step 2: Move dragged puzzle to the target date
        const { error: updateError1 } = await serviceSupabase
          .from(tableName)
          .update({ puzzle_date: newDate })
          .eq('id', puzzleId)

        if (updateError1) {
          console.error('Error updating first puzzle:', updateError1)
          // Rollback: move existing puzzle back to original date
          await serviceSupabase
            .from(tableName)
            .update({ puzzle_date: newDate })
            .eq('id', existingPuzzle.id)
          
          return NextResponse.json(
            { error: "Failed to swap puzzles - first move failed" },
            { status: 500 }
          )
        }

        // Step 3: Move existing puzzle to the dragged puzzle's original date
        const { error: updateError2 } = await serviceSupabase
          .from(tableName)
          .update({ puzzle_date: currentDate })
          .eq('id', existingPuzzle.id)

        if (updateError2) {
          console.error('Error updating second puzzle:', updateError2)
          // Rollback both moves
          await serviceSupabase
            .from(tableName)
            .update({ puzzle_date: currentDate })
            .eq('id', puzzleId)
          
          await serviceSupabase
            .from(tableName)
            .update({ puzzle_date: newDate })
            .eq('id', existingPuzzle.id)
          
          return NextResponse.json(
            { error: "Failed to swap puzzles - second move failed" },
            { status: 500 }
          )
        }

        return NextResponse.json({ 
          swapped: true,
          puzzle1: { ...currentPuzzle, puzzle_date: newDate },
          puzzle2: { ...existingPuzzle, puzzle_date: currentDate }
        })
      }
    } else {
      // Normal reschedule - just update the date
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
    }
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