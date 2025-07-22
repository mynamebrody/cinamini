import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PUT /api/user/favorites/:movieId - Update position of a favorite
export async function PUT(
  request: NextRequest,
  { params }: { params: { movieId: string } }
) {
  try {
    const supabase = await createClient()
    const movieId = parseInt(params.movieId)
    
    // Validate movieId
    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      )
    }
    
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
    const { position } = body
    
    // Validate position
    if (!position || position < 1 || position > 4) {
      return NextResponse.json(
        { error: "Position must be between 1 and 4" },
        { status: 400 }
      )
    }
    
    // Check if the favorite exists
    const { data: existingFavorite, error: fetchError } = await supabase
      .from('user_favorite_films')
      .select('*')
      .eq('user_id', user.id)
      .eq('movie_id', movieId)
      .single()
    
    if (fetchError || !existingFavorite) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      )
    }
    
    // If position is the same, no need to update
    if (existingFavorite.position === position) {
      return NextResponse.json({
        id: existingFavorite.id,
        movieId: existingFavorite.movie_id,
        title: existingFavorite.movie_title,
        posterPath: existingFavorite.poster_path,
        position: existingFavorite.position,
        updatedAt: existingFavorite.updated_at
      })
    }
    
    // Check if another movie is already at this position
    const { data: conflictingFavorite } = await supabase
      .from('user_favorite_films')
      .select('*')
      .eq('user_id', user.id)
      .eq('position', position)
      .single()
    
    // Begin transaction-like behavior
    // If there's a conflicting favorite, swap positions
    if (conflictingFavorite) {
      // Update the conflicting favorite to the old position
      const { error: swapError } = await supabase
        .from('user_favorite_films')
        .update({ position: existingFavorite.position })
        .eq('id', conflictingFavorite.id)
      
      if (swapError) {
        console.error('Error swapping positions:', swapError)
        return NextResponse.json(
          { error: "Failed to update positions" },
          { status: 500 }
        )
      }
    }
    
    // Update the target favorite to the new position
    const { data: updatedFavorite, error: updateError } = await supabase
      .from('user_favorite_films')
      .update({ position })
      .eq('id', existingFavorite.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating favorite:', updateError)
      return NextResponse.json(
        { error: "Failed to update favorite position" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      id: updatedFavorite.id,
      movieId: updatedFavorite.movie_id,
      title: updatedFavorite.movie_title,
      posterPath: updatedFavorite.poster_path,
      position: updatedFavorite.position,
      updatedAt: updatedFavorite.updated_at
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

// DELETE /api/user/favorites/:movieId - Remove a movie from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: { movieId: string } }
) {
  try {
    const supabase = await createClient()
    const movieId = parseInt(params.movieId)
    
    // Validate movieId
    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      )
    }
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Get the favorite to be deleted
    const { data: favoriteToDelete, error: fetchError } = await supabase
      .from('user_favorite_films')
      .select('*')
      .eq('user_id', user.id)
      .eq('movie_id', movieId)
      .single()
    
    if (fetchError || !favoriteToDelete) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      )
    }
    
    // Delete the favorite
    const { error: deleteError } = await supabase
      .from('user_favorite_films')
      .delete()
      .eq('id', favoriteToDelete.id)
    
    if (deleteError) {
      console.error('Error deleting favorite:', deleteError)
      return NextResponse.json(
        { error: "Failed to delete favorite" },
        { status: 500 }
      )
    }
    
    // Reorder remaining favorites to fill the gap
    const deletedPosition = favoriteToDelete.position
    
    // Get all favorites with position greater than the deleted one
    const { data: favoritesToShift, error: shiftFetchError } = await supabase
      .from('user_favorite_films')
      .select('*')
      .eq('user_id', user.id)
      .gt('position', deletedPosition)
      .order('position', { ascending: true })
    
    if (shiftFetchError) {
      console.error('Error fetching favorites to shift:', shiftFetchError)
      // Don't fail the delete operation, just log the error
    } else if (favoritesToShift && favoritesToShift.length > 0) {
      // Shift each favorite down by one position
      for (const favorite of favoritesToShift) {
        await supabase
          .from('user_favorite_films')
          .update({ position: favorite.position - 1 })
          .eq('id', favorite.id)
      }
    }
    
    return NextResponse.json({ success: true }, { status: 200 })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}