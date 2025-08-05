import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { localGameStorage, type LocalGameResult } from './local-game-storage'
import { cookies } from 'next/headers'

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

export async function migrateLocalDataForNewUser(
  userId: string, 
  localGameData: { results: LocalGameResult[], stats: any }
): Promise<MigrationResult> {
  const supabase = await createServerClient()
  
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    errors: []
  }

  try {
    // Check if user is actually new
    const isNew = await isNewUser(userId)
    if (!isNew) {
      result.errors.push('User already has game data')
      return result
    }

    // Filter for recent results (last 30 days to be more generous for new users)
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const recentResults = localGameData.results.filter(r => r.date >= cutoffDate)
    
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

  } catch (error) {
    console.error('Error during data migration:', error)
    result.success = false
    result.errors.push('General migration error')
  }

  return result
}

export async function isNewUser(userId: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Check if user has any game records across all game types
    const checks = await Promise.all([
      supabase.from('retitled_guesses').select('id').eq('user_id', userId).limit(1),
      supabase.from('budget_bracket_games').select('id').eq('user_id', userId).limit(1),
      supabase.from('cast_climb_guesses').select('id').eq('user_id', userId).limit(1),
      supabase.from('poster_pixels_games').select('id').eq('user_id', userId).limit(1)
    ])
    
    // If any check returns data, user is not new
    return checks.every(result => !result.data || result.data.length === 0)
  } catch (error) {
    console.error('Error checking if user is new:', error)
    return false
  }
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
        guess_film_id: gameData.guessed_movie_id || gameData.guess_film_id,
        is_correct: gameData.is_correct || false,
        solve_time_ms: gameData.solve_time_ms || gameData.total_duration_ms || 0,
        attempt_number: gameData.attempt_number || gameData.guess_count || 1,
        created_at: new Date(result.timestamp).toISOString()
      })
  }
}

async function migrateCastClimbResults(
  supabase: any, 
  userId: string, 
  results: LocalGameResult[]
) {
  for (const result of results) {
    // Get the puzzle for this date
    const { data: puzzle } = await supabase
      .from('cast_climb_puzzles')
      .select('id')
      .eq('puzzle_date', result.date)
      .single()

    if (!puzzle) continue

    const gameData = result.result
    
    // Migrate each guess for this game
    if (gameData.guesses && Array.isArray(gameData.guesses)) {
      for (let i = 0; i < gameData.guesses.length; i++) {
        const guess = gameData.guesses[i]
        
        // Check if guess already exists
        const { data: existingGuess } = await supabase
          .from('cast_climb_guesses')
          .select('id')
          .eq('user_id', userId)
          .eq('puzzle_id', puzzle.id)
          .eq('attempt_number', i + 1)
          .single()

        if (existingGuess) continue

        // Insert the guess
        await supabase
          .from('cast_climb_guesses')
          .insert({
            user_id: userId,
            puzzle_id: puzzle.id,
            guess_film_id: guess.guess_film_id,
            guess_film_title: guess.guess_film_title,
            guess_film_year: guess.guess_film_year || null,
            is_correct: guess.is_correct || false,
            actors_revealed: guess.actors_revealed || i + 1,
            solve_time_ms: guess.is_correct ? (gameData.solve_time_ms || 0) : null,
            attempt_number: i + 1,
            created_at: new Date(result.timestamp).toISOString()
          })
      }
    }
  }
}

async function migratePosterPixelsResults(
  supabase: any, 
  userId: string, 
  results: LocalGameResult[]
) {
  for (const result of results) {
    // Get the puzzle for this date
    const { data: puzzle } = await supabase
      .from('poster_pixels_puzzles')
      .select('id')
      .eq('puzzle_date', result.date)
      .single()

    if (!puzzle) continue

    const gameData = result.result
    
    // First create the game record
    const { data: existingGame } = await supabase
      .from('poster_pixels_games')
      .select('id')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzle.id)
      .single()

    if (!existingGame) {
      // Create game record
      const { data: newGame, error: gameError } = await supabase
        .from('poster_pixels_games')
        .insert({
          user_id: userId,
          puzzle_id: puzzle.id,
          final_clarity_level: gameData.final_clarity_level || 1.0,
          is_completed: gameData.is_completed || false,
          total_time_ms: gameData.total_time_ms || 0,
          created_at: new Date(result.timestamp).toISOString()
        })
        .select()
        .single()

      if (!gameError && newGame && gameData.guesses && Array.isArray(gameData.guesses)) {
        // Migrate each guess for this game
        for (let i = 0; i < gameData.guesses.length; i++) {
          const guess = gameData.guesses[i]
          
          await supabase
            .from('poster_pixels_guesses')
            .insert({
              user_id: userId,
              puzzle_id: puzzle.id,
              game_id: newGame.id,
              guess_number: i + 1,
              guessed_movie_id: guess.guess_film_id,
              guessed_movie_title: guess.guess_film_title,
              is_correct: guess.is_correct || false,
              time_taken_ms: guess.time_taken_ms || 0,
              clarity_level: guess.clarity_level || 1.0,
              created_at: new Date(result.timestamp).toISOString()
            })
        }
      }
    }
  }
}