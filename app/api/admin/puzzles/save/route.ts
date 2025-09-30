import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateCastClimbSeed } from "@/lib/cast-climb"
import { generateDailySeed } from "@/lib/game-seeding"

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

    // Validate supported game types
    const supportedGameTypes = ['retitled', 'budget_bracket', 'poster_pixels', 'cast_climb']
    if (!supportedGameTypes.includes(gameType)) {
      return NextResponse.json(
        { error: `Unsupported game type: ${gameType}` },
        { status: 400 }
      )
    }

    // Validate required fields based on game type
    const validationError = validatePuzzleData(gameType, puzzleData)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
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
    
    // Generate seed_value if not provided (based on puzzle_date or current date)
    if (!puzzleData.seed_value) {
      const seedDate = puzzleData.puzzle_date ? new Date(puzzleData.puzzle_date) : new Date()
      
      if (gameType === 'cast_climb') {
        puzzleData.seed_value = generateCastClimbSeed(seedDate)
      } else {
        // Generic seed generation for other game types
        puzzleData.seed_value = generateDailySeed(seedDate, { gameId: gameType })
      }
    }
    
    // Before insert, prevent duplicate film usage for specific games
    if (['retitled', 'poster_pixels', 'cast_climb'].includes(gameType)) {
      const tableName = `${gameType}_puzzles`
      const filmId = puzzleData.film_id
      if (typeof filmId !== 'number') {
        return NextResponse.json(
          { error: 'film_id must be a number' },
          { status: 400 }
        )
      }
      const { data: existingDup, error: dupError } = await serviceSupabase
        .from(tableName)
        .select('id')
        .eq('film_id', filmId)
        .limit(1)

      if (dupError) {
        console.error('Duplicate check failed:', dupError)
        return NextResponse.json(
          { error: 'Failed to validate puzzle uniqueness' },
          { status: 500 }
        )
      }
      if (existingDup && existingDup.length > 0) {
        return NextResponse.json(
          { error: 'A puzzle for this movie already exists for this game.' },
          { status: 409 }
        )
      }
    }

    // Insert the puzzle
    const tableName = `${gameType}_puzzles`

    const { data, error } = await serviceSupabase
      .from(tableName)
      .insert(puzzleData)
      .select()
      .single()

    if (error) {
      console.error(`Error saving ${gameType} puzzle:`, error)
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
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

function validatePuzzleData(gameType: string, puzzleData: any): string | null {
  // Common validation for all game types
  if (typeof puzzleData !== 'object' || puzzleData === null) {
    return 'Puzzle data must be an object'
  }

  switch (gameType) {
    case 'retitled':
      return validateRetitledPuzzle(puzzleData)
    case 'budget_bracket':
      return validateBudgetBracketPuzzle(puzzleData)
    case 'poster_pixels':
      return validatePosterPixelsPuzzle(puzzleData)
    case 'cast_climb':
      return validateCastClimbPuzzle(puzzleData)
    default:
      return `Unknown game type: ${gameType}`
  }
}

function validateRetitledPuzzle(data: any): string | null {
  const required = ['film_id', 'film_title', 'localized_title', 'country_code', 'distractor_ids']
  for (const field of required) {
    if (!data[field]) {
      return `Missing required field for retitled puzzle: ${field}`
    }
  }

  if (!Array.isArray(data.distractor_ids)) {
    return 'distractor_ids must be an array'
  }

  // puzzle_date can be null for drafts
  if (data.puzzle_date !== undefined && data.puzzle_date !== null && typeof data.puzzle_date !== 'string') {
    return 'puzzle_date must be a string or null'
  }

  return null
}

function validateBudgetBracketPuzzle(data: any): string | null {
  const required = ['seed_value', 'pairs']
  for (const field of required) {
    if (!data[field]) {
      return `Missing required field for budget bracket puzzle: ${field}`
    }
  }
  
  if (!Array.isArray(data.pairs)) {
    return 'pairs must be an array'
  }
  
  // puzzle_date can be null for drafts
  if (data.puzzle_date !== undefined && data.puzzle_date !== null && typeof data.puzzle_date !== 'string') {
    return 'puzzle_date must be a string or null'
  }
  
  return null
}

function validatePosterPixelsPuzzle(data: any): string | null {
  const required = ['film_id', 'film_title', 'film_poster_url', 'film_release_year', 'seed_value']
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      return `Missing required field for poster pixels puzzle: ${field}`
    }
  }

  // Validate film_id is a number
  if (typeof data.film_id !== 'number') {
    return 'film_id must be a number'
  }

  // Validate film_release_year is a number
  if (typeof data.film_release_year !== 'number') {
    return 'film_release_year must be a number'
  }

  // puzzle_date can be null for drafts
  if (data.puzzle_date !== undefined && data.puzzle_date !== null && typeof data.puzzle_date !== 'string') {
    return 'puzzle_date must be a string or null'
  }

  // Validate is_published if provided
  if (data.is_published !== undefined && typeof data.is_published !== 'boolean') {
    return 'is_published must be a boolean'
  }

  return null
}

function validateCastClimbPuzzle(data: any): string | null {
  const required = ['film_id', 'film_title', 'actors']
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      return `Missing required field for cast climb puzzle: ${field}`
    }
  }

  // Validate film_id is a number
  if (typeof data.film_id !== 'number') {
    return 'film_id must be a number'
  }

  // Validate actors is an array
  if (!Array.isArray(data.actors)) {
    return 'actors must be an array'
  }

  // Validate actors array has at least one actor
  if (data.actors.length < 1) {
    return 'actors array must contain at least one actor'
  }

  // Validate each actor object
  for (let i = 0; i < data.actors.length; i++) {
    const actor = data.actors[i]
    if (!actor.id || !actor.name) {
      return `Actor at index ${i} missing required fields (id, name)`
    }
    if (typeof actor.id !== 'number') {
      return `Actor at index ${i} has invalid id (must be number)`
    }
    // character can be empty string or null, that's fine
  }

  // puzzle_date can be null for drafts
  if (data.puzzle_date !== undefined && data.puzzle_date !== null && typeof data.puzzle_date !== 'string') {
    return 'puzzle_date must be a string or null'
  }

  // Validate is_published if provided
  if (data.is_published !== undefined && typeof data.is_published !== 'boolean') {
    return 'is_published must be a boolean'
  }

  return null
}
