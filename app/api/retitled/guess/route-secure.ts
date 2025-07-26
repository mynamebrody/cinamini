import { NextRequest, NextResponse } from "next/server"
import { getMovieById, getReleaseYear } from "@/lib/tmdb"
import { 
  GameAPI,
  gameSchemas,
  SecureDatabase,
  SecureErrorHandler,
  SecurityLogger,
  IDORProtection,
  ErrorCategory,
  ErrorSeverity,
  type ValidatedRequest,
  type RetitledGuessInput
} from "@/lib/validation"

// Secure Retitled Guess API with comprehensive validation and protection
export const POST = GameAPI.create<RetitledGuessInput>(
  async (request: NextRequest, validated: ValidatedRequest<RetitledGuessInput>) => {
    const { body: guessData, context } = validated
    const { puzzleId, guessFilmId, solveTimeMs, hintUsed } = guessData
    const userId = context.userId!

    try {
      // Log the game attempt
      SecurityLogger.logRequest(request, {
        userId,
        sessionId: context.sessionId
      })

      // Verify puzzle exists and is accessible
      const puzzleResult = await SecureDatabase.getPublicData(
        'retitled_puzzles',
        { id: puzzleId }
      )

      if (!puzzleResult.data || puzzleResult.data.length === 0) {
        return SecureErrorHandler.handleError(
          'Puzzle not found',
          {
            userId,
            endpoint: '/api/retitled/guess',
            method: 'POST',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          ErrorSeverity.LOW,
          ErrorCategory.VALIDATION
        )
      }

      const puzzle = puzzleResult.data[0]

      // Check if user has already played this puzzle (prevent duplicate submissions)
      const existingGuessResult = await SecureDatabase.getUserData(
        userId,
        'retitled_guesses',
        { puzzle_id: puzzleId }
      )

      if (existingGuessResult.data && existingGuessResult.data.length > 0) {
        SecurityLogger.logSecurityEvent('DUPLICATE_SUBMISSION', request, {
          userId,
          severity: 'low',
          description: 'User attempted to submit guess for already played puzzle',
          details: {
            puzzleId,
            existingGuessId: existingGuessResult.data[0].id
          }
        })

        return NextResponse.json({ 
          error: "Already played this puzzle",
          code: 'DUPLICATE_SUBMISSION'
        }, { status: 409 })
      }

      // Validate the guess is for a valid movie (prevent injection of invalid IDs)
      const guessMovie = await getMovieById(guessFilmId)
      if (!guessMovie) {
        return SecureErrorHandler.handleError(
          'Invalid movie ID in guess',
          {
            userId,
            endpoint: '/api/retitled/guess',
            method: 'POST',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          ErrorSeverity.MEDIUM,
          ErrorCategory.VALIDATION
        )
      }

      // Determine if guess is correct
      const isCorrect = guessFilmId === puzzle.film_id

      // Insert the guess with secure database operation
      const insertResult = await SecureDatabase.insertUserData(
        userId,
        'retitled_guesses',
        {
          puzzle_id: puzzleId,
          guess_film_id: guessFilmId,
          is_correct: isCorrect,
          solve_time_ms: solveTimeMs,
          hint_used: hintUsed || false,
          attempt_number: 1,
          created_at: new Date().toISOString()
        }
      )

      if (!insertResult.data) {
        return SecureErrorHandler.handleDatabaseError(
          insertResult.error || 'Failed to save guess',
          {
            userId,
            endpoint: '/api/retitled/guess',
            method: 'POST',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          'insert_guess'
        )
      }

      // Update user stats securely
      await updateUserStats(userId, isCorrect, solveTimeMs, puzzle.country_code)

      // Get the correct movie data for response
      const correctMovie = await getMovieById(puzzle.film_id)
      
      if (!correctMovie) {
        SecurityLogger.logError('Failed to fetch correct movie data', {
          userId,
          requestId: SecurityLogger.generateRequestId(),
          metadata: { puzzleId, correctFilmId: puzzle.film_id }
        })
        
        return SecureErrorHandler.handleExternalApiError(
          'Failed to get movie data',
          'TMDB',
          {
            userId,
            endpoint: '/api/retitled/guess',
            method: 'POST',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          }
        )
      }

      // Get updated stats for response
      const statsResult = await SecureDatabase.getUserData(
        userId,
        'retitled_user_stats',
        {}
      )

      const userStats = statsResult.data?.[0]

      // Log successful game completion
      SecurityLogger.logRequest(request, {
        userId,
        metadata: {
          gameResult: isCorrect ? 'correct' : 'incorrect',
          solveTime: solveTimeMs,
          hintUsed
        }
      })

      // Return secure response with sanitized data
      return NextResponse.json({
        success: true,
        correct: isCorrect,
        correctAnswer: {
          id: puzzle.film_id,
          title: correctMovie.title,
          originalTitle: correctMovie.original_title,
          releaseYear: getReleaseYear(correctMovie.release_date),
          translationNote: puzzle.translation_note || null
        },
        stats: userStats ? {
          gamesPlayed: userStats.games_played,
          accuracy: userStats.games_played > 0 
            ? Math.round((userStats.games_correct / userStats.games_played) * 100 * 10) / 10
            : 0,
          currentStreak: userStats.current_streak,
          longestStreak: userStats.longest_streak,
          averageSolveTime: userStats.average_solve_time_ms
        } : null
      }, { status: 200 })

    } catch (error) {
      // Comprehensive error handling with security logging
      SecurityLogger.logError('Retitled guess API error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        metadata: {
          puzzleId,
          guessFilmId,
          solveTimeMs
        }
      })

      return SecureErrorHandler.handleError(
        error instanceof Error ? error : 'Game submission failed',
        {
          userId,
          endpoint: '/api/retitled/guess',
          method: 'POST',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM
      )
    }
  },
  gameSchemas.retitledGuess,
  'retitled_guesses'
)

/**
 * Securely update user statistics
 */
async function updateUserStats(
  userId: string,
  isCorrect: boolean,
  solveTimeMs: number,
  countryCode: string
): Promise<void> {
  try {
    // Get current stats
    const currentStatsResult = await SecureDatabase.getUserData(
      userId,
      'retitled_user_stats',
      {}
    )

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let newStats = {
      games_played: 1,
      games_correct: isCorrect ? 1 : 0,
      current_streak: isCorrect ? 1 : 0,
      longest_streak: isCorrect ? 1 : 0,
      average_solve_time_ms: solveTimeMs,
      best_solve_time_ms: solveTimeMs,
      countries_guessed: isCorrect ? [countryCode] : [],
      last_played_date: today,
      updated_at: new Date().toISOString()
    }

    if (currentStatsResult.data && currentStatsResult.data[0]) {
      const currentStats = currentStatsResult.data[0]
      
      // Calculate streak continuation
      const wasYesterday = currentStats.last_played_date === yesterday
      const continueStreak = isCorrect && wasYesterday
      const newCurrentStreak = continueStreak ? currentStats.current_streak + 1 : (isCorrect ? 1 : 0)
      
      // Securely update countries list
      const countriesGuessed = currentStats.countries_guessed || []
      const newCountries = isCorrect && !countriesGuessed.includes(countryCode)
        ? [...countriesGuessed, countryCode]
        : countriesGuessed

      newStats = {
        games_played: currentStats.games_played + 1,
        games_correct: currentStats.games_correct + (isCorrect ? 1 : 0),
        current_streak: newCurrentStreak,
        longest_streak: Math.max(currentStats.longest_streak || 0, newCurrentStreak),
        average_solve_time_ms: Math.round(
          ((currentStats.average_solve_time_ms || 0) * currentStats.games_played + solveTimeMs) / 
          (currentStats.games_played + 1)
        ),
        best_solve_time_ms: Math.min(currentStats.best_solve_time_ms || solveTimeMs, solveTimeMs),
        countries_guessed: newCountries,
        last_played_date: today,
        updated_at: new Date().toISOString()
      }

      // Update existing stats
      await SecureDatabase.updateUserData(
        userId,
        'retitled_user_stats',
        newStats,
        {}
      )
    } else {
      // Insert new stats
      await SecureDatabase.insertUserData(
        userId,
        'retitled_user_stats',
        newStats
      )
    }

    // Log performance metrics
    SecurityLogger.logPerformanceMetrics({
      requestId: SecurityLogger.generateRequestId(),
      endpoint: '/api/retitled/guess',
      method: 'POST',
      duration: Date.now() - performance.now(),
      dbQueries: 3, // Approximate queries made
      memoryUsage: process.memoryUsage().heapUsed
    })

  } catch (error) {
    SecurityLogger.logError('Failed to update user stats', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: { isCorrect, solveTimeMs, countryCode }
    })
    
    // Don't throw - stats update failure shouldn't fail the main request
    console.error('Stats update error:', error)
  }
}