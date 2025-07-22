import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface FavoriteFilm {
  id: string
  movieId: number
  title: string
  posterPath: string | null
  position: number
  updatedAt: string
}

// GET /api/user/favorites - Fetch user's favorite films
export async function GET() {
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
    
    // Fetch user's favorite films
    const { data: favorites, error } = await supabase
      .from('user_favorite_films')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    
    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json(
        { error: "Failed to fetch favorite films" },
        { status: 500 }
      )
    }
    
    // Transform data to match the expected format
    const transformedFavorites: FavoriteFilm[] = (favorites || []).map(fav => ({
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

// POST /api/user/favorites - Add a movie to favorites
export async function POST(request: NextRequest) {
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
    const { movieId, title, posterPath, position } = body
    
    // Validate required fields
    if (!movieId || !title) {
      return NextResponse.json(
        { error: "Movie ID and title are required" },
        { status: 400 }
      )
    }
    
    // Check if user already has 4 favorites
    const { count, error: countError } = await supabase
      .from('user_favorite_films')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    if (countError) {
      console.error('Error checking favorites count:', countError)
      return NextResponse.json(
        { error: "Failed to check favorites count" },
        { status: 500 }
      )
    }
    
    if (count && count >= 4) {
      return NextResponse.json(
        { error: "Maximum 4 favorites allowed", code: "MAX_FAVORITES_REACHED" },
        { status: 400 }
      )
    }
    
    // Determine position if not provided
    let assignedPosition = position
    if (!assignedPosition) {
      // Find the next available position
      const { data: existingFavorites } = await supabase
        .from('user_favorite_films')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: true })
      
      const positions = existingFavorites?.map(f => f.position) || []
      assignedPosition = 1
      while (positions.includes(assignedPosition) && assignedPosition <= 4) {
        assignedPosition++
      }
    }
    
    // Insert the new favorite
    const { data: newFavorite, error: insertError } = await supabase
      .from('user_favorite_films')
      .insert({
        user_id: user.id,
        movie_id: movieId,
        movie_title: title,
        poster_path: posterPath,
        position: assignedPosition
      })
      .select()
      .single()
    
    if (insertError) {
      // Check if it's a duplicate movie
      if (insertError.code === '23505' && insertError.message.includes('user_id, movie_id')) {
        return NextResponse.json(
          { error: "Movie already in favorites" },
          { status: 409 }
        )
      }
      
      console.error('Error inserting favorite:', insertError)
      return NextResponse.json(
        { error: "Failed to add favorite film" },
        { status: 500 }
      )
    }
    
    // Transform and return the new favorite
    const transformedFavorite: FavoriteFilm = {
      id: newFavorite.id,
      movieId: newFavorite.movie_id,
      title: newFavorite.movie_title,
      posterPath: newFavorite.poster_path,
      position: newFavorite.position,
      updatedAt: newFavorite.updated_at
    }
    
    return NextResponse.json({ favorite: transformedFavorite }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}