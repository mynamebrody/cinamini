// Main validation and security utilities export
export {
  // Schemas and validation
  type RetitledGuessInput,
  type BudgetBracketGuessInput,
  type UserProfileInput,
  type FavoriteMovieInput,
  type PaginationInput,
  type SearchQueryInput,
  type ShareDataInput,
  type SecurityEventInput,
  type PuzzleCreationInput,
  gameSchemas,
  userSchemas,
  apiSchemas,
  securitySchemas,
  validateUUID,
  validateEmail,
  validateMovieId,
  sanitizeSearchQuery,
  validateDateRange
} from './schemas'

export {
  // Data sanitization
  DataSanitizer,
  sanitizeHtml,
  sanitizeText,
  sanitizeSearchQuery as sanitizeQuery,
  sanitizeSqlInput,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeEmail as sanitizeEmailString,
  sanitizePhoneNumber,
  sanitizeJsonString,
  sanitizeObject,
  sanitizeForDatabase,
  stripHtml,
  sanitizeUuid,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeRateLimitKey,
  sanitizeApiInput,
  sanitizeRequestBody,
  sanitizeTypedInput
} from './sanitization'

export {
  // Database security
  SecureQueryBuilder,
  SecureDatabase,
  createSecureQueryBuilder,
  type QueryResult,
  type PaginatedResult,
  type DatabaseSecurityContext
} from './database'

export {
  // Data encryption
  DataEncryption,
  EnvironmentEncryption,
  DatabaseFieldEncryption,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  hashData,
  generateHMAC,
  verifyHMAC,
  generateSecureToken,
  generateSecureId,
  encryptJSON,
  decryptJSON,
  encryptObjectFields,
  decryptObjectFields,
  generateDeduplicationHash,
  maskSensitiveData,
  generateAPIKey,
  validateAPIKeyFormat,
  extractKeyId,
  generateSessionToken,
  validateSessionToken
} from './encryption'

export {
  // Validation middleware
  ValidationMiddleware,
  createValidatedAPIRoute,
  GameValidation,
  UserValidation,
  ApiValidation,
  type ValidationResult,
  type ValidatedRequest,
  type ValidationConfig
} from './middleware'

export {
  // Error handling
  SecureErrorHandler,
  withErrorBoundary,
  ErrorUtils,
  ErrorSeverity,
  ErrorCategory,
  type SecureErrorResponse,
  type InternalErrorDetails
} from './error-handling'

export {
  // Logging and monitoring
  SecurityLogger,
  withRequestLogging,
  LogLevel,
  LogCategory,
  type RequestLogEntry,
  type SecurityLogEntry,
  type PerformanceMetrics
} from './logging'

export {
  // Client-side validation
  ClientValidator,
  useFormValidation,
  type ClientValidationResult,
  type FormValidationState
} from './client'

export {
  // IDOR protection
  IDORProtection,
  SecureQueryWithIDOR,
  withIDORProtection,
  type ResourceOwnership,
  type ResourcePermission,
  type IDORProtectionResult
} from './idor-protection'

// Convenience wrapper combining all security measures
export function createSecureAPI<TBody = any, TQuery = any, TParams = any>(
  handler: (
    request: Request,
    validated: ValidatedRequest<TBody, TQuery, TParams>
  ) => Promise<Response> | Response,
  config: {
    // Validation schemas
    body?: any
    query?: any
    params?: any
    
    // Security settings
    requireAuth?: boolean
    requireAdmin?: boolean
    enableCSRF?: boolean
    enableRateLimit?: boolean
    
    // HTTP settings
    methods?: string[]
    maxBodySize?: number
    
    // IDOR protection
    resourceType?: string
    resourceIdParam?: string
    resourceAction?: 'read' | 'write' | 'delete' | 'admin'
    
    // Logging
    logRequests?: boolean
    logResponses?: boolean
    logPerformance?: boolean
  } = {}
) {
  const {
    body: bodySchema,
    query: querySchema,
    params: paramsSchema,
    requireAuth = false,
    requireAdmin = false,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    resourceType,
    resourceIdParam = 'id',
    resourceAction = 'read',
    logRequests = true,
    logResponses = false,
    logPerformance = false
  } = config

  return createValidatedAPIRoute(
    async (request, validated) => {
      // Apply IDOR protection if resource type is specified
      if (resourceType && validated.params) {
        const resourceId = validated.params[resourceIdParam]
        
        if (resourceId) {
          const protection = await IDORProtection.checkResourceAccess(
            validated.context.userId,
            resourceType,
            resourceId,
            resourceAction,
            request
          )

          if (!protection.allowed) {
            return new Response(
              JSON.stringify({
                error: protection.reason || 'Access denied',
                code: 'ACCESS_DENIED'
              }),
              { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          }
        }
      }

      return handler(request, validated)
    },
    {
      body: bodySchema,
      query: querySchema,
      params: paramsSchema,
      methods,
      validation: {
        requireAuth,
        requireAdmin,
        enableCSRF: true,
        enableRateLimit: true,
        logRequest: logRequests,
        maxBodySize: config.maxBodySize
      }
    }
  )
}

// Pre-configured API builders for common use cases
export const GameAPI = {
  /**
   * Create a secure game API endpoint (requires auth, validates game data)
   */
  create: <T = any>(
    handler: (request: Request, validated: ValidatedRequest<T>) => Promise<Response>,
    schema: any,
    resourceType?: string
  ) => createSecureAPI(handler, {
    body: schema,
    methods: ['POST'],
    requireAuth: true,
    resourceType,
    resourceAction: 'write',
    logRequests: true
  }),

  /**
   * Create a game stats endpoint (read-only, with IDOR protection)
   */
  stats: <T = any>(
    handler: (request: Request, validated: ValidatedRequest<never, T>) => Promise<Response>,
    querySchema?: any
  ) => createSecureAPI(handler, {
    query: querySchema,
    methods: ['GET'],
    requireAuth: true,
    resourceType: 'user_stats',
    resourceAction: 'read',
    logRequests: true
  })
}

export const UserAPI = {
  /**
   * Create a user profile endpoint
   */
  profile: <T = any>(
    handler: (request: Request, validated: ValidatedRequest<T>) => Promise<Response>,
    schema?: any
  ) => createSecureAPI(handler, {
    body: schema,
    methods: ['GET', 'PUT', 'PATCH'],
    requireAuth: true,
    resourceType: 'cinamini_user_profiles',
    resourceAction: 'write',
    logRequests: true
  }),

  /**
   * Create a user favorites endpoint
   */
  favorites: <T = any>(
    handler: (request: Request, validated: ValidatedRequest<T>) => Promise<Response>,
    schema?: any
  ) => createSecureAPI(handler, {
    body: schema,
    methods: ['GET', 'POST', 'DELETE'],
    requireAuth: true,
    resourceType: 'user_favorites',
    resourceAction: 'write',
    logRequests: true
  })
}

export const AdminAPI = {
  /**
   * Create an admin-only endpoint
   */
  create: <T = any>(
    handler: (request: Request, validated: ValidatedRequest<T>) => Promise<Response>,
    config: {
      body?: any
      query?: any
      methods?: string[]
      resourceType?: string
    } = {}
  ) => createSecureAPI(handler, {
    ...config,
    requireAuth: true,
    requireAdmin: true,
    resourceAction: 'admin',
    logRequests: true,
    logResponses: true
  })
}

// Utility function to create a complete security configuration
export function createSecurityConfig(overrides: Record<string, any> = {}) {
  return {
    enableCSRF: true,
    enableRateLimit: true,
    enableSecurityHeaders: true,
    enableAuthentication: true,
    enableLogging: true,
    enableIDORProtection: true,
    enableInputSanitization: true,
    enableOutputSanitization: true,
    enableErrorHandling: true,
    enableEncryption: true,
    ...overrides
  }
}

// Export everything from the main validation utilities
export * from './schemas'
export * from './sanitization'
export * from './database'
export * from './encryption'
export * from './middleware'
export * from './error-handling'
export * from './logging'
export * from './client'
export * from './idor-protection'