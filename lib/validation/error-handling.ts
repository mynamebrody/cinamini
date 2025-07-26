import { NextResponse } from "next/server"
import { DataSanitizer } from "./sanitization"
import { SecurityEventInput, securitySchemas } from "./schemas"

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for classification
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  SECURITY = 'security',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic'
}

// Standardized error response structure
export interface SecureErrorResponse {
  error: string
  code: string
  timestamp: number
  requestId?: string
  details?: Record<string, any>
}

// Internal error details (not exposed to clients)
export interface InternalErrorDetails {
  originalError: Error | string
  stack?: string
  context: {
    userId?: string
    endpoint: string
    method: string
    userAgent?: string
    ipAddress?: string
    timestamp: number
    requestId: string
  }
  severity: ErrorSeverity
  category: ErrorCategory
  metadata?: Record<string, any>
}

/**
 * Secure error handler that prevents information leakage
 */
export class SecureErrorHandler {
  private static isDevelopment = process.env.NODE_ENV === 'development'
  private static isProduction = process.env.NODE_ENV === 'production'

  /**
   * Handle and sanitize errors for API responses
   */
  static handleError(
    error: Error | string,
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    },
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()
    
    const internalDetails: InternalErrorDetails = {
      originalError: error,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity,
      category
    }

    // Log error internally
    this.logError(internalDetails)

    // Create sanitized response
    const secureResponse = this.createSecureResponse(error, category, requestId, severity)

    // Determine HTTP status code
    const statusCode = this.getStatusCode(category, error)

    return NextResponse.json(secureResponse, { status: statusCode })
  }

  /**
   * Handle validation errors specifically
   */
  static handleValidationError(
    validationErrors: Record<string, string[]> | string[],
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    }
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()

    // Log validation error
    this.logError({
      originalError: 'Validation failed',
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      metadata: { validationErrors }
    })

    const response: SecureErrorResponse = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      timestamp: Date.now(),
      requestId,
      details: this.isDevelopment ? { validation: validationErrors } : undefined
    }

    return NextResponse.json(response, { status: 400 })
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(
    error: Error | string,
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    },
    isAuthRequired: boolean = true
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()

    // Log authentication error (potential security issue)
    this.logError({
      originalError: error,
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHENTICATION,
      metadata: { isAuthRequired }
    })

    // Log security event
    this.logSecurityEvent('AUTHENTICATION_FAILURE', context, {
      error: error instanceof Error ? error.message : error,
      isAuthRequired
    })

    const response: SecureErrorResponse = {
      error: isAuthRequired ? 'Authentication required' : 'Invalid credentials',
      code: isAuthRequired ? 'AUTH_REQUIRED' : 'AUTH_INVALID',
      timestamp: Date.now(),
      requestId
    }

    return NextResponse.json(response, { status: 401 })
  }

  /**
   * Handle authorization errors
   */
  static handleAuthzError(
    error: Error | string,
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    },
    requiredPermission?: string
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()

    // Log authorization error (security concern)
    this.logError({
      originalError: error,
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHORIZATION,
      metadata: { requiredPermission }
    })

    // Log security event
    this.logSecurityEvent('AUTHORIZATION_FAILURE', context, {
      error: error instanceof Error ? error.message : error,
      requiredPermission
    })

    const response: SecureErrorResponse = {
      error: 'Access denied',
      code: 'ACCESS_DENIED',
      timestamp: Date.now(),
      requestId
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(
    error: Error | string,
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    },
    operation?: string
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()
    const errorMessage = error instanceof Error ? error.message : error

    // Check for potential SQL injection attempts
    const sqlInjectionPatterns = [
      /union.*select/i,
      /drop.*table/i,
      /delete.*from/i,
      /insert.*into/i,
      /update.*set/i,
      /exec\(/i,
      /xp_/i,
      /sp_/i
    ]

    const isSqlInjectionAttempt = sqlInjectionPatterns.some(pattern => 
      pattern.test(errorMessage)
    )

    const severity = isSqlInjectionAttempt ? ErrorSeverity.CRITICAL : ErrorSeverity.MEDIUM

    // Log database error
    this.logError({
      originalError: error,
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity,
      category: ErrorCategory.DATABASE,
      metadata: { operation, isSqlInjectionAttempt }
    })

    // Log security event if potential injection
    if (isSqlInjectionAttempt) {
      this.logSecurityEvent('SQL_INJECTION_ATTEMPT', context, {
        error: errorMessage,
        operation
      })
    }

    const response: SecureErrorResponse = {
      error: this.getDatabaseErrorMessage(errorMessage),
      code: 'DATABASE_ERROR',
      timestamp: Date.now(),
      requestId
    }

    return NextResponse.json(response, { status: 500 })
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    },
    retryAfter?: number
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()

    // Log rate limit violation
    this.logError({
      originalError: 'Rate limit exceeded',
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.SECURITY,
      metadata: { retryAfter }
    })

    this.logSecurityEvent('RATE_LIMIT_EXCEEDED', context, { retryAfter })

    const response: SecureErrorResponse = {
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      timestamp: Date.now(),
      requestId
    }

    const nextResponse = NextResponse.json(response, { status: 429 })
    
    if (retryAfter) {
      nextResponse.headers.set('Retry-After', retryAfter.toString())
    }

    return nextResponse
  }

  /**
   * Handle external API errors
   */
  static handleExternalApiError(
    error: Error | string,
    apiName: string,
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
      requestId?: string
    }
  ): NextResponse {
    const requestId = context.requestId || this.generateRequestId()

    // Log external API error
    this.logError({
      originalError: error,
      context: {
        ...context,
        timestamp: Date.now(),
        requestId
      },
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.EXTERNAL_API,
      metadata: { apiName }
    })

    const response: SecureErrorResponse = {
      error: 'External service temporarily unavailable',
      code: 'EXTERNAL_SERVICE_ERROR',
      timestamp: Date.now(),
      requestId
    }

    return NextResponse.json(response, { status: 503 })
  }

  /**
   * Create sanitized error response
   */
  private static createSecureResponse(
    error: Error | string,
    category: ErrorCategory,
    requestId: string,
    severity: ErrorSeverity
  ): SecureErrorResponse {
    const baseResponse: SecureErrorResponse = {
      error: this.getGenericErrorMessage(category),
      code: this.getErrorCode(category),
      timestamp: Date.now(),
      requestId
    }

    // In development, include more details
    if (this.isDevelopment) {
      baseResponse.details = {
        originalMessage: error instanceof Error ? error.message : error,
        severity,
        category
      }
    }

    return baseResponse
  }

  /**
   * Determine HTTP status code based on error category
   */
  private static getStatusCode(category: ErrorCategory, error: Error | string): number {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400
      case ErrorCategory.AUTHENTICATION:
        return 401
      case ErrorCategory.AUTHORIZATION:
        return 403
      case ErrorCategory.DATABASE:
        return 500
      case ErrorCategory.EXTERNAL_API:
        return 503
      case ErrorCategory.SECURITY:
        return 429
      case ErrorCategory.BUSINESS_LOGIC:
        return 422
      default:
        return 500
    }
  }

  /**
   * Get generic error message that doesn't leak information
   */
  private static getGenericErrorMessage(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 'Invalid request data'
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication required'
      case ErrorCategory.AUTHORIZATION:
        return 'Access denied'
      case ErrorCategory.DATABASE:
        return 'Database operation failed'
      case ErrorCategory.EXTERNAL_API:
        return 'External service unavailable'
      case ErrorCategory.SECURITY:
        return 'Security check failed'
      case ErrorCategory.BUSINESS_LOGIC:
        return 'Operation not permitted'
      default:
        return 'Internal server error'
    }
  }

  /**
   * Get error code for categorization
   */
  private static getErrorCode(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 'VALIDATION_ERROR'
      case ErrorCategory.AUTHENTICATION:
        return 'AUTH_ERROR'
      case ErrorCategory.AUTHORIZATION:
        return 'AUTHZ_ERROR'
      case ErrorCategory.DATABASE:
        return 'DB_ERROR'
      case ErrorCategory.EXTERNAL_API:
        return 'EXTERNAL_ERROR'
      case ErrorCategory.SECURITY:
        return 'SECURITY_ERROR'
      case ErrorCategory.BUSINESS_LOGIC:
        return 'BUSINESS_ERROR'
      default:
        return 'INTERNAL_ERROR'
    }
  }

  /**
   * Sanitize database error messages
   */
  private static getDatabaseErrorMessage(error: string): string {
    // Remove sensitive information from database errors
    const sanitizedError = error
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/\b\d{4,}\b/g, '[NUMBER]') // Remove long numbers
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails

    // Map to generic messages for production
    if (this.isProduction) {
      if (error.includes('duplicate') || error.includes('unique')) {
        return 'Record already exists'
      }
      if (error.includes('foreign key') || error.includes('constraint')) {
        return 'Invalid data relationship'
      }
      if (error.includes('not found')) {
        return 'Record not found'
      }
      return 'Database operation failed'
    }

    return sanitizedError
  }

  /**
   * Log error internally (structured logging)
   */
  private static logError(details: InternalErrorDetails): void {
    const logEntry = {
      level: this.getLogLevel(details.severity),
      timestamp: new Date().toISOString(),
      requestId: details.context.requestId,
      category: details.category,
      severity: details.severity,
      message: details.originalError instanceof Error 
        ? details.originalError.message 
        : details.originalError,
      context: {
        userId: details.context.userId,
        endpoint: details.context.endpoint,
        method: details.context.method,
        userAgent: DataSanitizer.maskSensitiveData(details.context.userAgent || ''),
        ipAddress: details.context.ipAddress
      },
      metadata: details.metadata,
      stack: this.isDevelopment ? details.stack : undefined
    }

    // In production, you'd send this to your logging service
    // For now, we'll use console with appropriate log level
    switch (details.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL ERROR:', logEntry)
        break
      case ErrorSeverity.HIGH:
        console.error('HIGH SEVERITY ERROR:', logEntry)
        break
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM SEVERITY ERROR:', logEntry)
        break
      case ErrorSeverity.LOW:
        console.log('LOW SEVERITY ERROR:', logEntry)
        break
    }
  }

  /**
   * Log security events
   */
  private static logSecurityEvent(
    eventType: string,
    context: {
      userId?: string
      endpoint: string
      method: string
      userAgent?: string
      ipAddress?: string
    },
    metadata?: Record<string, any>
  ): void {
    const securityEvent: SecurityEventInput = {
      eventType: eventType as any,
      userId: context.userId,
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent,
      requestPath: context.endpoint,
      additionalData: {
        method: context.method,
        timestamp: Date.now(),
        ...metadata
      }
    }

    // Validate security event schema
    const validation = securitySchemas.securityEvent.safeParse(securityEvent)
    
    if (validation.success) {
      // In production, send to security monitoring system
      console.warn('SECURITY EVENT:', validation.data)
    } else {
      console.error('Invalid security event format:', validation.error)
    }
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get log level based on severity
   */
  private static getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'error'
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.LOW:
        return 'info'
      default:
        return 'info'
    }
  }
}

/**
 * Error boundary for API routes
 */
export function withErrorBoundary(
  handler: Function,
  context: {
    endpoint: string
    method: string
  }
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('Unhandled error in API route:', error)
      
      return SecureErrorHandler.handleError(
        error instanceof Error ? error : 'Unknown error',
        {
          endpoint: context.endpoint,
          method: context.method,
          timestamp: Date.now()
        },
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM
      )
    }
  }
}

/**
 * Utility functions for error handling
 */
export const ErrorUtils = {
  isValidationError: (error: any): boolean => {
    return error?.code === 'VALIDATION_ERROR'
  },

  isAuthError: (error: any): boolean => {
    return error?.code === 'AUTH_ERROR' || error?.code === 'AUTH_REQUIRED'
  },

  isDatabaseError: (error: any): boolean => {
    return error?.code === 'DB_ERROR'
  },

  getErrorSeverity: (error: Error): ErrorSeverity => {
    if (error.message.includes('CRITICAL') || error.message.includes('SECURITY')) {
      return ErrorSeverity.CRITICAL
    }
    if (error.message.includes('AUTH') || error.message.includes('PERMISSION')) {
      return ErrorSeverity.HIGH
    }
    if (error.message.includes('VALIDATION') || error.message.includes('FORMAT')) {
      return ErrorSeverity.LOW
    }
    return ErrorSeverity.MEDIUM
  }
}

export { SecureErrorHandler as default }