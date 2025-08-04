import { createClient } from '@/lib/supabase/client'
import { localGameStorage, type LocalGameResult } from './local-game-storage'

interface MigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
}

export async function migrateLocalDataToAccount(userId: string): Promise<MigrationResult> {
  const supabase = createClient()
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    errors: []
  }

  try {
    // Get recent game results (last 7 days)
    const recentResults = localGameStorage.getRecentResults(7)
    
    if (recentResults.length === 0) {
      return result
    }

    // Group results by game type
    const gameGroups = recentResults.reduce((acc, result) => {
      if (!acc[result.gameId]) {
        acc[result.gameId] = []
      }
      acc[result.gameId].push(result)
      return acc
    }, {} as Record<string, LocalGameResult[]>)

    // Migrate each game type
    for (const [gameId, results] of Object.entries(gameGroups)) {
      try {
        switch (gameId) {
          case 'budget-bracket':
            await migrateBudgetBracketResults(supabase, userId, results)
            result.migratedCount += results.length
            break
          case 'retitled':
            await migrateRetitledResults(supabase, userId, results)
            result.migratedCount += results.length
            break
          case 'cast-climb':
            await migrateCastClimbResults(supabase, userId, results)
            result.migratedCount += results.length
            break
          case 'poster-pixels':
            await migratePosterPixelsResults(supabase, userId, results)
            result.migratedCount += results.length
            break
          default:
            console.warn(`Unknown game type: ${gameId}`)
        }
      } catch (error) {
        console.error(`Error migrating ${gameId} results:`, error)
        result.errors.push(`Failed to migrate ${gameId} results`)
        result.success = false
      }
    }

    // Clear local data on successful migration
    if (result.success && result.migratedCount > 0) {
      localGameStorage.clearAllData()
    }

  } catch (error) {
    console.error('Error during data migration:', error)
    result.success = false
    result.errors.push('General migration error')
  }

  return result
}

async function migrateBudgetBracketResults(
  supabase: any, 
  userId: string, 
  results: LocalGameResult[]
) {
  for (const result of results) {
    // Get the puzzle for this date
    const { data: puzzle } = await supabase
      .from('budget_bracket_puzzles')
      .select('id')
      .eq('puzzle_date', result.date)
      .single()

    if (!puzzle) continue

    // Check if game already exists
    const { data: existingGame } = await supabase
      .from('budget_bracket_games')
      .select('id')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzle.id)
      .single()

    if (existingGame) continue

    // Insert the game result
    const gameData = result.result
    await supabase
      .from('budget_bracket_games')
      .insert({
        user_id: userId,
        puzzle_id: puzzle.id,
        rounds_completed: gameData.rounds_completed || 0,
        final_result: gameData.final_result || 'lost',
        is_perfect_game: gameData.is_perfect_game || false,
        total_duration_ms: gameData.total_duration_ms || 0,
        created_at: new Date(result.timestamp).toISOString()
      })
  }
}

async function migrateRetitledResults(
  supabase: any, 
  userId: string, 
  results: LocalGameResult[]
) {
  for (const result of results) {
    // Get the puzzle for this date
    const { data: puzzle } = await supabase
      .from('retitled_puzzles')
      .select('id')
      .eq('puzzle_date', result.date)
      .single()

    if (!puzzle) continue

    // Check if guess already exists
    const { data: existingGuess } = await supabase
      .from('retitled_guesses')
      .select('id')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzle.id)
      .single()

    if (existingGuess) continue

    // Insert the guess
    const gameData = result.result
    await supabase
      .from('retitled_guesses')
      .insert({
        user_id: userId,
        puzzle_id: puzzle.id,
        guessed_movie_id: gameData.guessed_movie_id,
        is_correct: gameData.is_correct || false,
        guess_count: gameData.guess_count || 1,
        total_duration_ms: gameData.total_duration_ms || 0,
        created_at: new Date(result.timestamp).toISOString()
      })
  }
}

async function migrateCastClimbResults(
  supabase: any, 
  userId: string, 
  results: LocalGameResult[]
) {
  // Similar implementation for cast-climb
  // This would need to be adapted based on the actual game schema
  console.log('Cast Climb migration not yet implemented')
}

async function migratePosterPixelsResults(
  supabase: any, 
  userId: string, 
  results: LocalGameResult[]
) {
  // Similar implementation for poster-pixels
  // This would need to be adapted based on the actual game schema
  console.log('Poster Pixels migration not yet implemented')
}