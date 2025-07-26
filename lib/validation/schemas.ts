import { z } from 'zod'

// Base validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email format').max(255)
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one digit')

// Common field validators
export const movieIdSchema = z.number().int().positive('Movie ID must be a positive integer')
export const tmdbIdSchema = z.number().int().positive('TMDB ID must be a positive integer')
export const countryCodeSchema = z.string().length(2, 'Country code must be exactly 2 characters').toUpperCase()
export const puzzleDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
export const solveTimeSchema = z.number().int().min(0).max(3600000, 'Solve time must be between 0 and 3600000ms')

// Text fields with sanitization
export const displayNameSchema = z.string()
  .min(1, 'Display name is required')
  .max(50, 'Display name must not exceed 50 characters')
  .regex(/^[a-zA-Z0-9_\s-]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, and underscores')

export const movieTitleSchema = z.string()
  .min(1, 'Movie title is required')
  .max(200, 'Movie title must not exceed 200 characters')

export const translationNoteSchema = z.string()
  .max(500, 'Translation note must not exceed 500 characters')
  .optional()

// URL and path validators
export const urlSchema = z.string().url('Invalid URL format').max(2000)
export const pathSchema = z.string().regex(/^\/[a-zA-Z0-9\/_-]*$/, 'Invalid path format')

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1).max(100, 'Limit must be between 1 and 100').default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Game-specific schemas
export const retitledGuessSchema = z.object({
  puzzleId: uuidSchema,
  guessFilmId: tmdbIdSchema,
  solveTimeMs: solveTimeSchema,
  hintUsed: z.boolean().default(false)
})

export const budgetBracketGuessSchema = z.object({
  puzzleId: uuidSchema,
  guesses: z.array(z.object({
    movieId: tmdbIdSchema,
    selectedRange: z.string().regex(/^\d+-\d+$/, 'Range must be in format "min-max"')
  })).min(1, 'At least one guess is required').max(10, 'Maximum 10 guesses allowed'),
  solveTimeMs: solveTimeSchema
})

// User profile schemas
export const userProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarUrl: urlSchema.optional(),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional()
})

export const userStatsUpdateSchema = z.object({
  gamesPlayed: z.number().int().min(0).optional(),
  gamesCorrect: z.number().int().min(0).optional(),
  currentStreak: z.number().int().min(0).optional(),
  longestStreak: z.number().int().min(0).optional(),
  averageSolveTimeMs: z.number().int().min(0).optional(),
  lastPlayedDate: puzzleDateSchema.optional()
})

// Favorite movies schema
export const favoriteMovieSchema = z.object({
  movieId: tmdbIdSchema,
  title: movieTitleSchema,
  posterPath: z.string().optional(),
  releaseYear: z.number().int().min(1888).max(new Date().getFullYear() + 5).optional()
})

export const reorderFavoritesSchema = z.object({
  movieIds: z.array(tmdbIdSchema).min(1, 'At least one movie ID is required').max(10, 'Maximum 10 favorites allowed')
})

// API request schemas
export const apiKeySchema = z.string().min(10, 'API key must be at least 10 characters')
export const headerSchema = z.object({
  'user-agent': z.string().optional(),
  'accept': z.string().optional(),
  'content-type': z.string().optional(),
  'authorization': z.string().optional(),
  'x-csrf-token': z.string().optional(),
  'x-api-key': apiKeySchema.optional()
})

// Query parameter schemas
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query must not exceed 100 characters'),
  page: z.number().int().min(1).default(1),
  include_adult: z.boolean().default(false)
})

export const movieSearchParamsSchema = z.object({
  query: z.string().min(1).max(100),
  year: z.number().int().min(1888).max(new Date().getFullYear() + 5).optional(),
  page: z.number().int().min(1).max(1000).default(1)
})

// Share and social schemas
export const shareDataSchema = z.object({
  gameType: z.enum(['retitled', 'budget-bracket']),
  puzzleId: uuidSchema,
  result: z.object({
    correct: z.boolean(),
    attempts: z.number().int().min(1).max(6),
    solveTime: solveTimeSchema.optional()
  }),
  spoilerFree: z.boolean().default(true)
})

// Admin schemas
export const puzzleCreationSchema = z.object({
  puzzleDate: puzzleDateSchema,
  filmId: tmdbIdSchema,
  filmTitle: movieTitleSchema,
  localizedTitle: movieTitleSchema,
  countryCode: countryCodeSchema,
  distractorIds: z.array(tmdbIdSchema).min(3).max(5),
  difficultyLevel: z.number().int().min(1).max(5).default(1),
  translationNote: translationNoteSchema
})

// Security and audit schemas
export const securityEventSchema = z.object({
  eventType: z.enum([
    'RATE_LIMIT_EXCEEDED',
    'CSRF_VIOLATION', 
    'SQL_INJECTION_ATTEMPT',
    'XSS_ATTEMPT',
    'UNAUTHORIZED_ACCESS',
    'IDOR_ATTEMPT',
    'SUSPICIOUS_ACTIVITY'
  ]),
  userId: uuidSchema.optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  requestPath: pathSchema.optional(),
  additionalData: z.record(z.any()).optional()
})

// File upload schemas (for future use)
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().int().min(1).max(5 * 1024 * 1024), // 5MB max
  data: z.string().base64('Invalid base64 data')
})

// Webhook schemas (for external integrations)
export const webhookPayloadSchema = z.object({
  event: z.string().min(1),
  timestamp: z.number().int().positive(),
  data: z.record(z.any()),
  signature: z.string().optional()
})

// Export grouped schemas for easier imports
export const gameSchemas = {
  retitledGuess: retitledGuessSchema,
  budgetBracketGuess: budgetBracketGuessSchema,
  puzzleCreation: puzzleCreationSchema,
  shareData: shareDataSchema
}

export const userSchemas = {
  profile: userProfileSchema,
  statsUpdate: userStatsUpdateSchema,
  favoriteMovie: favoriteMovieSchema,
  reorderFavorites: reorderFavoritesSchema
}

export const apiSchemas = {
  pagination: paginationSchema,
  searchQuery: searchQuerySchema,
  movieSearchParams: movieSearchParamsSchema,
  headers: headerSchema
}

export const securitySchemas = {
  securityEvent: securityEventSchema,
  fileUpload: fileUploadSchema,
  webhookPayload: webhookPayloadSchema
}

// Custom validation functions
export function validateUUID(value: string): boolean {
  return uuidSchema.safeParse(value).success
}

export function validateEmail(value: string): boolean {
  return emailSchema.safeParse(value).success
}

export function validateMovieId(value: number): boolean {
  return movieIdSchema.safeParse(value).success
}

export function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could be used for injection
  return query.replace(/[<>\"'%;()&+]/g, '').trim().substring(0, 100)
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start <= end && start >= new Date('2020-01-01') && end <= new Date()
}

// Type exports for TypeScript
export type RetitledGuessInput = z.infer<typeof retitledGuessSchema>
export type BudgetBracketGuessInput = z.infer<typeof budgetBracketGuessSchema>
export type UserProfileInput = z.infer<typeof userProfileSchema>
export type FavoriteMovieInput = z.infer<typeof favoriteMovieSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type SearchQueryInput = z.infer<typeof searchQuerySchema>
export type ShareDataInput = z.infer<typeof shareDataSchema>
export type SecurityEventInput = z.infer<typeof securityEventSchema>
export type PuzzleCreationInput = z.infer<typeof puzzleCreationSchema>