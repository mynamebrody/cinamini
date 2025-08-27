import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBlendedMoviePool } from "@/lib/tmdb-trending"
import { POSTER_PIXELS_LEVELS } from "@/lib/poster-pixels-config"


// Seed for consistent daily puzzles
function getDailySeed(): number {
  const today = new Date()
  const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`
  
  // Create a simple hash from the date string
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash)
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
  return function() {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const supabaseService = createServiceClient()
    
    // Get current user (optional - no longer required)
    const { data: { user } } = await supabase.auth.getUser()

    const today = new Date().toISOString().split('T')[0]
    
    // Check if we already have today's puzzle (using service client to bypass RLS)
    const { data: existingPuzzle } = await supabaseService
      .from("poster_pixels_puzzles")
      .select("*")
      .eq("puzzle_date", today)
      .single()

    let puzzle = existingPuzzle

    // If no puzzle exists for today, create one (using service client)
    if (!puzzle) {
      try {
        // Get blended movie pool (trending + popular)
        const moviePool = await getBlendedMoviePool()
        
        // Filter movies that have poster images
        const moviesWithPosters = moviePool.filter(movie => movie.poster_path)
        
        if (moviesWithPosters.length === 0) {
          throw new Error("No movies with posters available")
        }

        // Use seeded random to select a movie
        const seed = getDailySeed()
        const random = seededRandom(seed)
        const selectedIndex = Math.floor(random() * moviesWithPosters.length)
        const selectedMovie = moviesWithPosters[selectedIndex]

        // Create the puzzle (using service client to bypass RLS)
        const { data: newPuzzle, error: insertError } = await supabaseService
          .from("poster_pixels_puzzles")
          .insert({
            puzzle_date: today,
            is_published: true,
            film_id: selectedMovie.id,
            film_title: selectedMovie.title,
            film_poster_url: selectedMovie.poster_path,
            film_release_year: selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : null,
            seed_value: `pp_${today}`,
            difficulty_level: 1,
            clarity_levels: Array.from(POSTER_PIXELS_LEVELS),
            // Keep movie_data for backward compatibility
            movie_data: {
              id: selectedMovie.id,
              title: selectedMovie.title,
              poster_path: selectedMovie.poster_path,
              release_date: selectedMovie.release_date,
              overview: selectedMovie.overview,
            },
          })
          .select()
          .single()

        if (insertError) {
          console.error("Error creating puzzle:", insertError)
          throw insertError
        }

        puzzle = newPuzzle
      } catch (error) {
        console.error("Error generating puzzle:", error)
        
        // Fallback to a hardcoded popular movie if API fails
        const fallbackMovies = [
          {
            id: 550,
            title: "Fight Club",
            poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
            release_date: "1999-10-15",
            overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
          },
          {
            id: 680,
            title: "Pulp Fiction",
            poster_path: "/fIE3lAGcZDV1G6XM5KmuWnNsPp1.jpg",
            release_date: "1994-09-10",
            overview: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper.",
          },
          {
            id: 155,
            title: "The Dark Knight",
            poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            release_date: "2008-07-14",
            overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
          },
        ]

        const seed = getDailySeed()
        const random = seededRandom(seed)
        const selectedIndex = Math.floor(random() * fallbackMovies.length)
        const selectedMovie = fallbackMovies[selectedIndex]

        const { data: newPuzzle, error: insertError } = await supabaseService
          .from("poster_pixels_puzzles")
          .insert({
            puzzle_date: today,
            is_published: true,
            film_id: selectedMovie.id,
            film_title: selectedMovie.title,
            film_poster_url: selectedMovie.poster_path,
            film_release_year: selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : null,
            seed_value: `pp_fallback_${today}`,
            difficulty_level: 1,
            clarity_levels: Array.from(POSTER_PIXELS_LEVELS),
            // Keep movie_data for backward compatibility
            movie_data: selectedMovie,
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        puzzle = newPuzzle
      }
    }

    // Check if user has played today (only if authenticated)
    let todaysGame = null
    let hasPlayedBefore = false
    
    if (user) {
      // First check if user has EVER played Poster Pixels before (for how-to-play modal)
      const { data: anyPreviousGames } = await supabase
        .from("poster_pixels_games")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single()
      
      hasPlayedBefore = !!anyPreviousGames
      
      // Now check today's puzzle specifically
      const { data: userGame } = await supabase
        .from("poster_pixels_games")
        .select(`
          *,
          poster_pixels_guesses(*)
        `)
        .eq("user_id", user.id)
        .eq("puzzle_id", puzzle.id)
        .single()
      
      todaysGame = userGame
    }

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        puzzle_date: puzzle.puzzle_date,
        puzzle_number: puzzle.puzzle_number,
        // New admin structure fields
        film_id: puzzle.film_id,
        film_title: puzzle.film_title,
        film_poster_url: puzzle.film_poster_url,
        film_release_year: puzzle.film_release_year,
        clarity_levels: puzzle.clarity_levels,
        // Legacy movie_data for backward compatibility
        movie_data: puzzle.movie_data || {
          id: puzzle.film_id,
          title: puzzle.film_title,
          poster_path: puzzle.film_poster_url,
          release_date: puzzle.film_release_year ? `${puzzle.film_release_year}-01-01` : null,
        },
      },
      hasPlayedToday: !!todaysGame,
      hasPlayedBefore,
      previousGame: todaysGame ? {
        won: todaysGame.won,
        total_time_ms: todaysGame.total_time_ms,
        final_clarity_level: todaysGame.final_clarity_level,
        guesses: todaysGame.poster_pixels_guesses.map((g: any) => ({
          movieId: g.guessed_movie_id,
          movieTitle: g.guessed_movie_title,
          isCorrect: g.is_correct,
          clarityLevel: g.clarity_level,
        })),
      } : null,
    })
  } catch (error) {
    console.error("Error in poster-pixels puzzle API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}