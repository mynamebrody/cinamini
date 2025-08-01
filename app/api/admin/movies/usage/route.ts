import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Verify admin status
    const { data: profile, error: profileError } = await supabase
      .from("cinamini_user_profiles")
      .select("is_super_admin")
      .eq("user_id", user.id)
      .single()
    
    if (profileError || !profile?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }
    
    // Get movieId from query params
    const searchParams = request.nextUrl.searchParams
    const movieId = searchParams.get("movieId")
    
    if (!movieId || isNaN(parseInt(movieId))) {
      return NextResponse.json(
        { error: "Invalid or missing movieId parameter" },
        { status: 400 }
      )
    }
    
    const movieIdNum = parseInt(movieId)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Initialize results object
    const usage = {
      movieId: movieIdNum,
      totalUsage: 0,
      usageByGame: {
        retitled: [],
        budgetBracket: [],
        castClimb: []
      }
    }
    
    // Check retitled_puzzles
    const { data: retitledPuzzles, error: retitledError } = await supabase
      .from("retitled_puzzles")
      .select("id, puzzle_date, film_title")
      .eq("film_id", movieIdNum)
      .gte("puzzle_date", thirtyDaysAgo.toISOString().split('T')[0])
      .order("puzzle_date", { ascending: false })
    
    if (retitledError) {
      console.error("Error fetching retitled puzzles:", retitledError)
    } else if (retitledPuzzles) {
      usage.usageByGame.retitled = retitledPuzzles.map(puzzle => ({
        puzzleId: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        gameType: "retitled",
        filmTitle: puzzle.film_title
      }))
    }
    
    // Check cast_climb_puzzles
    const { data: castClimbPuzzles, error: castClimbError } = await supabase
      .from("cast_climb_puzzles")
      .select("id, puzzle_date, film_title")
      .eq("film_id", movieIdNum)
      .gte("puzzle_date", thirtyDaysAgo.toISOString().split('T')[0])
      .order("puzzle_date", { ascending: false })
    
    if (castClimbError) {
      console.error("Error fetching cast climb puzzles:", castClimbError)
    } else if (castClimbPuzzles) {
      usage.usageByGame.castClimb = castClimbPuzzles.map(puzzle => ({
        puzzleId: puzzle.id,
        puzzleDate: puzzle.puzzle_date,
        gameType: "cast_climb",
        filmTitle: puzzle.film_title
      }))
    }
    
    // Check budget_bracket_puzzles (JSONB field)
    // We need to search within the pairs JSONB array for movies with matching id
    const { data: budgetBracketPuzzles, error: budgetBracketError } = await supabase
      .from("budget_bracket_puzzles")
      .select("id, puzzle_date, pairs")
      .gte("puzzle_date", thirtyDaysAgo.toISOString().split('T')[0])
      .order("puzzle_date", { ascending: false })
    
    if (budgetBracketError) {
      console.error("Error fetching budget bracket puzzles:", budgetBracketError)
    } else if (budgetBracketPuzzles) {
      // Filter puzzles that contain the movieId in their pairs
      usage.usageByGame.budgetBracket = budgetBracketPuzzles
        .filter(puzzle => {
          // Each puzzle has a pairs array with movie pair objects
          if (!puzzle.pairs || !Array.isArray(puzzle.pairs)) return false
          
          return puzzle.pairs.some((pair: any) => {
            // Check both movieA and movieB for the matching id
            return (pair.movieA?.id === movieIdNum) || (pair.movieB?.id === movieIdNum)
          })
        })
        .map(puzzle => {
          // Find the movie title from the pairs
          let filmTitle = ""
          puzzle.pairs.forEach((pair: any) => {
            if (pair.movieA?.id === movieIdNum) {
              filmTitle = pair.movieA.title
            } else if (pair.movieB?.id === movieIdNum) {
              filmTitle = pair.movieB.title
            }
          })
          
          return {
            puzzleId: puzzle.id,
            puzzleDate: puzzle.puzzle_date,
            gameType: "budget_bracket",
            filmTitle
          }
        })
    }
    
    // Calculate total usage
    usage.totalUsage = 
      usage.usageByGame.retitled.length +
      usage.usageByGame.budgetBracket.length +
      usage.usageByGame.castClimb.length
    
    // Combine all usage and sort by date
    const allUsage = [
      ...usage.usageByGame.retitled,
      ...usage.usageByGame.budgetBracket,
      ...usage.usageByGame.castClimb
    ].sort((a, b) => new Date(b.puzzleDate).getTime() - new Date(a.puzzleDate).getTime())
    
    return NextResponse.json({
      movieId: movieIdNum,
      totalUsage: usage.totalUsage,
      last30Days: {
        retitled: usage.usageByGame.retitled.length,
        budgetBracket: usage.usageByGame.budgetBracket.length,
        castClimb: usage.usageByGame.castClimb.length
      },
      usage: allUsage,
      usageByGame: usage.usageByGame
    })
    
  } catch (error) {
    console.error("Error in movie usage API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}