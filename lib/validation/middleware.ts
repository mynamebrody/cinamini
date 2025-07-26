import { NextRequest, NextResponse } from "next/server"
import { z, ZodSchema, ZodError } from "zod"
import { DataSanitizer, sanitizeRequestBody } from "./sanitization"
import { createSecureQueryBuilder, DatabaseSecurityContext } from "./database"
import { 
  gameSchemas, 
  userSchemas, 
  apiSchemas, 
  securitySchemas,
  type RetitledGuessInput,
  type BudgetBracketGuessInput,
  type UserProfileInput,
  type PaginationInput
} from "./schemas"

// Validation result types
export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors?: string[]
  fieldErrors?: Record<string, string[]>
}

export interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> {
  body: TBody
  query: TQuery
  params: TParams
  headers: Record<string, string>
  context: {
    userId?: string
    isAuthenticated: boolean
    isAdmin: boolean
    ipAddress?: string
    userAgent?: string
  }
}

// Middleware configuration
export interface ValidationConfig {
  sanitizeInput?: boolean
  requireAuth?: boolean
  requireAdmin?: boolean
  rateLimitKey?: string
  logRequest?: boolean
  enableCors?: boolean
  maxBodySize?: number
}

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  sanitizeInput: true,
  requireAuth: false,
  requireAdmin: false,
  logRequest: true,
  enableCors: true,
  maxBodySize: 1024 * 1024 // 1MB
}

/**
 * Main validation middleware class
 */
export class ValidationMiddleware {
  /**
   * Validate request body against a Zod schema
   */
  static validateBody<T>(schema: ZodSchema<T>, body: any): ValidationResult<T> {
    try {
      const data = schema.parse(body)
      return { success: true, data }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {}
        const errors: string[] = []

        error.issues.forEach(issue => {
          const path = issue.path.join('.')
          const message = issue.message

          if (path) {
            if (!fieldErrors[path]) {
              fieldErrors[path] = []
            }
            fieldErrors[path].push(message)
          } else {
            errors.push(message)
          }
        })

        return { success: false, errors, fieldErrors }
      }

      return { success: false, errors: ['Invalid request body format'] }
    }
  }

  /**
   * Validate query parameters
   */
  static validateQuery<T>(schema: ZodSchema<T>, query: any): ValidationResult<T> {
    // Convert query string values to appropriate types
    const processedQuery = this.processQueryParams(query)
    return this.validateBody(schema, processedQuery)
  }

  /**
   * Validate URL parameters
   */
  static validateParams<T>(schema: ZodSchema<T>, params: any): ValidationResult<T> {
    return this.validateBody(schema, params)
  }

  /**
   * Validate request headers
   */
  static validateHeaders(headers: Headers): ValidationResult<Record<string, string>> {
    const headerObj: Record<string, string> = {}
    
    // Extract and validate common headers
    const allowedHeaders = [
      'authorization',
      'content-type',
      'user-agent',
      'accept',
      'x-csrf-token',
      'x-api-key',
      'x-forwarded-for',
      'x-real-ip'
    ]

    allowedHeaders.forEach(header => {
      const value = headers.get(header)
      if (value) {
        headerObj[header] = DataSanitizer.sanitizeText(value)
      }
    })

    return { success: true, data: headerObj }
  }

  /**
   * Extract and validate authentication context
   */
  static async validateAuthContext(request: NextRequest): Promise<{
    userId?: string
    isAuthenticated: boolean
    isAdmin: boolean
  }> {
    try {
      // This would integrate with your existing auth system
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader) {
        return { isAuthenticated: false, isAdmin: false }
      }

      // Mock implementation - replace with actual auth validation
      // In a real app, this would verify the JWT token
      const token = authHeader.replace('Bearer ', '')
      
      // Basic token validation (you'd use proper JWT verification)
      if (token && token.length > 10) {
        // Mock user extraction from token
        return {
          userId: 'mock-user-id',
          isAuthenticated: true,
          isAdmin: false
        }
      }

      return { isAuthenticated: false, isAdmin: false }
    } catch (error) {
      console.error('Auth context validation error:', error)
      return { isAuthenticated: false, isAdmin: false }
    }
  }

  /**
   * Process query parameters to convert types
   */
  private static processQueryParams(query: any): any {
    const processed: any = {}

    for (const [key, value] of Object.entries(query || {})) {
      if (typeof value === 'string') {
        // Try to convert numeric strings
        if (/^\d+$/.test(value)) {
          processed[key] = parseInt(value, 10)
        } else if (/^\d*\.\d+$/.test(value)) {
          processed[key] = parseFloat(value)
        } else if (value === 'true' || value === 'false') {
          processed[key] = value === 'true'
        } else {
          processed[key] = value
        }
      } else {
        processed[key] = value
      }
    }

    return processed
  }

  /**
   * Check content length limits
   */
  static validateContentLength(request: NextRequest, maxSize: number): ValidationResult {
    const contentLength = request.headers.get('content-length')
    
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > maxSize) {
        return {
          success: false,
          errors: [`Request body too large. Maximum size: ${maxSize} bytes`]
        }
      }
    }

    return { success: true }
  }

  /**
   * Validate content type
   */
  static validateContentType(request: NextRequest, allowedTypes: string[]): ValidationResult {
    const contentType = request.headers.get('content-type')
    
    if (!contentType) {
      return { success: false, errors: ['Content-Type header is required'] }
    }

    const isAllowed = allowedTypes.some(type => contentType.includes(type))
    
    if (!isAllowed) {
      return {
        success: false,
        errors: [`Invalid content type. Allowed types: ${allowedTypes.join(', ')}`]
      }
    }

    return { success: true }
  }

  /**
   * Validate IP address and check for suspicious patterns
   */
  static validateIP(request: NextRequest): ValidationResult<{
    ip: string
    isSuspicious: boolean
    country?: string
  }> {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const remoteAddr = request.ip
    
    // Get the client IP (prioritize x-forwarded-for, then x-real-ip, then direct)
    const ip = forwarded?.split(',')[0]?.trim() || realIP || remoteAddr || 'unknown'
    
    // Basic suspicious IP patterns (you'd use a proper IP reputation service)
    const suspiciousPatterns = [
      /^10\./, // Private networks (might be suspicious if not expected)
      /^192\.168\./, // Private networks
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private networks
      /^127\./, // Localhost
      /^0\./, // Invalid
    ]

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(ip))

    return {
      success: true,
      data: { ip, isSuspicious }
    }
  }
}

/**
 * API Route validation wrapper
 */
export function createValidatedAPIRoute<
  TBody = any,
  TQuery = any,
  TParams = any
>(
  handler: (
    request: NextRequest,
    validated: ValidatedRequest<TBody, TQuery, TParams>
  ) => Promise<NextResponse> | NextResponse,
  config: {
    body?: ZodSchema<TBody>
    query?: ZodSchema<TQuery>
    params?: ZodSchema<TParams>
    methods?: string[]
    validation?: ValidationConfig
  } = {}
) {
  const {
    body: bodySchema,
    query: querySchema,
    params: paramsSchema,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    validation = {}
  } = config

  const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...validation }

  return async (request: NextRequest, context?: { params?: any }): Promise<NextResponse> => {
    try {
      // Method validation
      if (!methods.includes(request.method)) {
        return NextResponse.json(
          { 
            error: `Method ${request.method} not allowed`,
            code: 'METHOD_NOT_ALLOWED'
          },
          { 
            status: 405,
            headers: { Allow: methods.join(', ') }
          }
        )
      }

      // Content length validation
      if (finalConfig.maxBodySize && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const lengthValidation = ValidationMiddleware.validateContentLength(
          request, 
          finalConfig.maxBodySize
        )
        
        if (!lengthValidation.success) {
          return NextResponse.json(
            { 
              error: lengthValidation.errors?.[0] || 'Request too large',
              code: 'PAYLOAD_TOO_LARGE'
            },
            { status: 413 }
          )
        }
      }

      // Content type validation for body requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentTypeValidation = ValidationMiddleware.validateContentType(
          request,
          ['application/json']
        )
        
        if (!contentTypeValidation.success) {
          return NextResponse.json(
            { 
              error: contentTypeValidation.errors?.[0] || 'Invalid content type',
              code: 'INVALID_CONTENT_TYPE'
            },
            { status: 415 }
          )
        }
      }

      // Authentication validation
      const authContext = await ValidationMiddleware.validateAuthContext(request)
      
      if (finalConfig.requireAuth && !authContext.isAuthenticated) {
        return NextResponse.json(
          { 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        )
      }

      if (finalConfig.requireAdmin && !authContext.isAdmin) {
        return NextResponse.json(
          { 
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
          },
          { status: 403 }
        )
      }

      // IP validation
      const ipValidation = ValidationMiddleware.validateIP(request)
      
      // Header validation
      const headerValidation = ValidationMiddleware.validateHeaders(request.headers)

      // Parse and validate request body
      let validatedBody: TBody | undefined
      if (bodySchema) {
        try {
          const rawBody = await request.json()
          const sanitizedBody = finalConfig.sanitizeInput ? sanitizeRequestBody(rawBody) : rawBody
          
          const bodyValidation = ValidationMiddleware.validateBody(bodySchema, sanitizedBody)
          
          if (!bodyValidation.success) {
            return NextResponse.json(
              {
                error: 'Invalid request body',
                code: 'VALIDATION_ERROR',
                details: bodyValidation.fieldErrors || bodyValidation.errors
              },
              { status: 400 }
            )
          }
          
          validatedBody = bodyValidation.data
        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Invalid JSON in request body',
              code: 'INVALID_JSON'
            },
            { status: 400 }
          )
        }
      }

      // Parse and validate query parameters
      let validatedQuery: TQuery | undefined
      if (querySchema) {
        const url = new URL(request.url)
        const queryObj = Object.fromEntries(url.searchParams.entries())
        
        const queryValidation = ValidationMiddleware.validateQuery(querySchema, queryObj)
        
        if (!queryValidation.success) {
          return NextResponse.json(
            {
              error: 'Invalid query parameters',
              code: 'VALIDATION_ERROR',
              details: queryValidation.fieldErrors || queryValidation.errors
            },
            { status: 400 }
          )
        }
        
        validatedQuery = queryValidation.data
      }

      // Parse and validate URL parameters
      let validatedParams: TParams | undefined
      if (paramsSchema && context?.params) {
        const paramsValidation = ValidationMiddleware.validateParams(paramsSchema, context.params)
        
        if (!paramsValidation.success) {
          return NextResponse.json(
            {
              error: 'Invalid URL parameters',
              code: 'VALIDATION_ERROR',
              details: paramsValidation.fieldErrors || paramsValidation.errors
            },
            { status: 400 }
          )
        }
        
        validatedParams = paramsValidation.data
      }

      // Create validated request object
      const validatedRequest: ValidatedRequest<TBody, TQuery, TParams> = {
        body: validatedBody as TBody,
        query: validatedQuery as TQuery,
        params: validatedParams as TParams,
        headers: headerValidation.data || {},
        context: {
          ...authContext,
          ipAddress: ipValidation.data?.ip,
          userAgent: request.headers.get('user-agent') || undefined
        }
      }

      // Log request if enabled
      if (finalConfig.logRequest) {
        console.log(`API Request: ${request.method} ${new URL(request.url).pathname}`, {
          authenticated: authContext.isAuthenticated,
          userId: authContext.userId,
          ip: ipValidation.data?.ip,
          userAgent: validatedRequest.context.userAgent
        })
      }

      // Call the actual handler
      const response = await handler(request, validatedRequest)

      // Add security headers to response
      if (finalConfig.enableCors) {
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
      }

      return response

    } catch (error) {
      console.error('Validation middleware error:', error)
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Pre-configured validation wrappers for common use cases
 */
export const GameValidation = {
  retitledGuess: (handler: any) => createValidatedAPIRoute(handler, {
    body: gameSchemas.retitledGuess,
    methods: ['POST'],
    validation: { requireAuth: true }
  }),

  budgetBracketGuess: (handler: any) => createValidatedAPIRoute(handler, {
    body: gameSchemas.budgetBracketGuess,
    methods: ['POST'],
    validation: { requireAuth: true }
  })
}

export const UserValidation = {
  updateProfile: (handler: any) => createValidatedAPIRoute(handler, {
    body: userSchemas.profile,
    methods: ['PUT', 'PATCH'],
    validation: { requireAuth: true }
  }),

  addFavorite: (handler: any) => createValidatedAPIRoute(handler, {
    body: userSchemas.favoriteMovie,
    methods: ['POST'],
    validation: { requireAuth: true }
  })
}

export const ApiValidation = {
  paginated: (handler: any) => createValidatedAPIRoute(handler, {
    query: apiSchemas.pagination,
    methods: ['GET']
  }),

  search: (handler: any) => createValidatedAPIRoute(handler, {
    query: apiSchemas.searchQuery,
    methods: ['GET']
  })
}

// Export validation schemas for direct use
export { gameSchemas, userSchemas, apiSchemas, securitySchemas }

export default ValidationMiddleware