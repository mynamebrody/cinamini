import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { gameType, puzzleData } = body
    
    if (!gameType || !puzzleData) {
      return NextResponse.json(
        { error: "Game type and puzzle data are required" },
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
    
    // Insert the puzzle
    const tableName = `${gameType}_puzzles`
    const { data, error } = await serviceSupabase
      .from(tableName)
      .insert(puzzleData)
      .select()
      .single()

    if (error) {
      console.error(`Error saving ${gameType} puzzle:`, error)
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ puzzle: data })
  } catch (error) {
    console.error('Error saving puzzle:', error)
    return NextResponse.json(
      { error: "Failed to save puzzle" },
      { status: 500 }
    )
  }
}