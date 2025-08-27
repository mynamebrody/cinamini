import { NextResponse } from "next/server"

/**
 * Common date validation logic for by-date puzzle endpoints
 */
export interface DateValidationResult {
  isValid: boolean
  error?: { message: string; status: number }
  puzzleDate?: Date
}

export function validatePuzzleDate(dateString: string | null): DateValidationResult {
  // Check if date is provided
  if (!dateString) {
    return {
      isValid: false,
      error: { message: "Date parameter is required", status: 400 }
    }
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return {
      isValid: false,
      error: { message: "Invalid date format. Use YYYY-MM-DD", status: 400 }
    }
  }

  const puzzleDate = new Date(dateString + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Check if date is valid
  if (isNaN(puzzleDate.getTime())) {
    return {
      isValid: false,
      error: { message: "Invalid date", status: 400 }
    }
  }

  // Check if date is in the future
  if (puzzleDate > today) {
    return {
      isValid: false,
      error: { message: "Cannot access future puzzles", status: 400 }
    }
  }

  // Check if date is before game launch
  const launchDate = new Date('2024-01-01T00:00:00Z')
  if (puzzleDate < launchDate) {
    return {
      isValid: false,
      error: { message: "No puzzle available for this date", status: 404 }
    }
  }

  return {
    isValid: true,
    puzzleDate
  }
}

/**
 * Configuration for puzzle retrieval
 */
export interface PuzzleConfig {
  tableName: string
  generatePuzzle: (date: Date) => Promise<any>
  insertPuzzleData: (puzzle: any) => any // Transform generated puzzle to DB format
}

/**
 * Common logic for getting or creating puzzles for a specific date
 */
export async function getOrCreatePuzzleForDate(
  supabase: any,
  date: Date,
  config: PuzzleConfig,
  allowCreation: boolean = true
): Promise<any | null> {
  const dateString = date.toISOString().split('T')[0]

  try {
    // First, try to get existing puzzle
    const { data: existingPuzzle, error: fetchError } = await supabase
      .from(config.tableName)
      .select('*')
      .eq('puzzle_date', dateString)
      .single()

    if (existingPuzzle && !fetchError) {
      return existingPuzzle
    }

    // If no existing puzzle and creation is not allowed, return null
    if (!allowCreation) {
      console.log(`No existing puzzle found for ${config.tableName} on ${dateString} and creation is disabled`)
      return null
    }

    // If no existing puzzle, generate a new one
    console.log(`Generating new puzzle for ${config.tableName} on ${dateString}`)
    const generatedPuzzle = await config.generatePuzzle(date)

    if (!generatedPuzzle) {
      console.error(`Failed to generate puzzle for ${config.tableName} on date:`, dateString)
      return null
    }

    // Transform and insert the new puzzle
    const insertData = config.insertPuzzleData(generatedPuzzle)

    const { data: insertedPuzzle, error: insertError } = await supabase
      .from(config.tableName)
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      // Check if it's a unique constraint violation (puzzle already exists)
      if (insertError.code === '23505') {
        console.log(`${config.tableName}: Puzzle was created concurrently, fetching existing one`)
        const { data: concurrentPuzzle } = await supabase
          .from(config.tableName)
          .select('*')
          .eq('puzzle_date', dateString)
          .single()
        return concurrentPuzzle
      } else {
        console.error(`Error inserting puzzle into ${config.tableName}:`, insertError)
        return null
      }
    }

    console.log(`Successfully created puzzle for ${config.tableName} on ${dateString}`)
    return insertedPuzzle
  } catch (error) {
    console.error(`Error in getOrCreatePuzzleForDate for ${config.tableName}:`, error)
    return null
  }
}

/**
 * Standard error response format
 */
export function createErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      status,
      timestamp: new Date().toISOString()
    }, 
    { status }
  )
}

/**
 * Check if user has played the game before (for how-to-play modal)
 */
export async function checkUserPlayHistory(
  supabase: any,
  userId: string,
  tableName: string,
  userIdColumn: string = 'user_id'
): Promise<boolean> {
  const { data } = await supabase
    .from(tableName)
    .select('id')
    .eq(userIdColumn, userId)
    .limit(1)
    .single()

  return !!data
}

/**
 * Calculate puzzle number based on date order
 */
export async function calculatePuzzleNumber(
  supabase: any,
  tableName: string,
  puzzleDate: string
): Promise<number> {
  const { count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .lt('puzzle_date', puzzleDate)

  return (count || 0) + 1
}