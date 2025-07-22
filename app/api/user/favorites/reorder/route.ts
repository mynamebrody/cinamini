import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface ReorderUpdate {
  movieId: number
  position: number
}

// PUT /api/user/favorites/reorder - Bulk update positions for drag-and-drop
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { updates } = body as { updates: ReorderUpdate[] }
    
    // Validate updates
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Invalid updates array" },
        { status: 400 }
      )
    }
    
    // Validate all positions are unique and within range
    const positions = updates.map(u => u.position)
    const uniquePositions = new Set(positions)
    
    if (positions.length !== uniquePositions.size) {
      return NextResponse.json(
        { error: "Duplicate positions not allowed" },
        { status: 400 }
      )
    }
    
    if (positions.some(p => p < 1 || p > 4)) {
      return NextResponse.json(
        { error: "All positions must be between 1 and 4" },
        { status: 400 }
      )
    }
    
    // Fetch all user's current favorites to validate
    const { data: currentFavorites, error: fetchError } = await supabase
      .from('user_favorite_films')
      .select('movie_id')
      .eq('user_id', user.id)
    
    if (fetchError) {
      console.error('Error fetching current favorites:', fetchError)
      return NextResponse.json(
        { error: "Failed to fetch current favorites" },
        { status: 500 }
      )
    }
    
    const currentMovieIds = new Set(currentFavorites?.map(f => f.movie_id) || [])
    const updateMovieIds = new Set(updates.map(u => u.movieId))
    
    // Ensure all movies in updates are actually user's favorites
    for (const movieId of updateMovieIds) {
      if (!currentMovieIds.has(movieId)) {
        return NextResponse.json(
          { error: `Movie ${movieId} is not in user's favorites` },
          { status: 400 }
        )
      }
    }
    
    // Perform all updates
    const updatePromises = updates.map(update => 
      supabase
        .from('user_favorite_films')
        .update({ position: update.position })
        .eq('user_id', user.id)
        .eq('movie_id', update.movieId)
    )
    
    const results = await Promise.all(updatePromises)
    
    // Check if any updates failed
    const failedUpdate = results.find(result => result.error)
    if (failedUpdate) {
      console.error('Error updating positions:', failedUpdate.error)
      return NextResponse.json(
        { error: "Failed to update positions" },
        { status: 500 }
      )
    }
    
    // Fetch and return the updated favorites
    const { data: updatedFavorites, error: finalFetchError } = await supabase
      .from('user_favorite_films')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    
    if (finalFetchError) {
      console.error('Error fetching updated favorites:', finalFetchError)
      return NextResponse.json(
        { error: "Failed to fetch updated favorites" },
        { status: 500 }
      )
    }
    
    // Transform data to match the expected format
    const transformedFavorites = (updatedFavorites || []).map(fav => ({
      id: fav.id,
      movieId: fav.movie_id,
      title: fav.movie_title,
      posterPath: fav.poster_path,
      position: fav.position,
      updatedAt: fav.updated_at
    }))
    
    return NextResponse.json({ favorites: transformedFavorites })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}