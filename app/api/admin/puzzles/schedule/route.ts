import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
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

    // Fetch all puzzles in date range for all games
    const [retitledPuzzles, budgetBracketPuzzles, castClimbPuzzles, posterPixelsPuzzles] = await Promise.all([
      serviceSupabase
        .from('retitled_puzzles')
        .select('*')
        .gte('puzzle_date', startDate)
        .lte('puzzle_date', endDate)
        .order('puzzle_date', { ascending: true }),
      
      serviceSupabase
        .from('budget_bracket_puzzles')
        .select('*')
        .gte('puzzle_date', startDate)
        .lte('puzzle_date', endDate)
        .order('puzzle_date', { ascending: true }),
      
      serviceSupabase
        .from('cast_climb_puzzles')
        .select('*')
        .gte('puzzle_date', startDate)
        .lte('puzzle_date', endDate)
        .order('puzzle_date', { ascending: true }),
      
      serviceSupabase
        .from('poster_pixels_puzzles')
        .select('*')
        .gte('puzzle_date', startDate)
        .lte('puzzle_date', endDate)
        .order('puzzle_date', { ascending: true })
    ])

    // Also fetch draft puzzles (null puzzle_date)
    const [retitledDrafts, budgetBracketDrafts, castClimbDrafts, posterPixelsDrafts] = await Promise.all([
      serviceSupabase
        .from('retitled_puzzles')
        .select('*')
        .is('puzzle_date', null)
        .order('created_at', { ascending: false }),
      
      serviceSupabase
        .from('budget_bracket_puzzles')
        .select('*')
        .is('puzzle_date', null)
        .order('created_at', { ascending: false }),
      
      serviceSupabase
        .from('cast_climb_puzzles')
        .select('*')
        .is('puzzle_date', null)
        .order('created_at', { ascending: false }),
      
      serviceSupabase
        .from('poster_pixels_puzzles')
        .select('*')
        .is('puzzle_date', null)
        .order('created_at', { ascending: false })
    ])

    // Combine and format the data
    const puzzles = {
      scheduled: [
        ...(retitledPuzzles.data || []).map(p => ({ ...p, game_type: 'retitled' })),
        ...(budgetBracketPuzzles.data || []).map(p => ({ ...p, game_type: 'budget_bracket' })),
        ...(castClimbPuzzles.data || []).map(p => ({ ...p, game_type: 'cast_climb' })),
        ...(posterPixelsPuzzles.data || []).map(p => ({ ...p, game_type: 'poster_pixels' }))
      ],
      drafts: [
        ...(retitledDrafts.data || []).map(p => ({ ...p, game_type: 'retitled' })),
        ...(budgetBracketDrafts.data || []).map(p => ({ ...p, game_type: 'budget_bracket' })),
        ...(castClimbDrafts.data || []).map(p => ({ ...p, game_type: 'cast_climb' })),
        ...(posterPixelsDrafts.data || []).map(p => ({ ...p, game_type: 'poster_pixels' }))
      ]
    }

    return NextResponse.json(puzzles)
  } catch (error) {
    console.error('Error fetching puzzle schedule:', error)
    return NextResponse.json(
      { error: "Failed to fetch puzzle schedule" },
      { status: 500 }
    )
  }
}