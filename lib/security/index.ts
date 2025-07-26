import { NextRequest, NextResponse } from "next/server"
import { csrfProtection, addCSRFToken } from "./csrf"
import { rateLimitMiddleware, addRateLimitHeaders } from "./rate-limit"
import { securityMiddleware, logSecurityEvent } from "./headers"
import { authMiddleware, extractUserId, updateUserActivity, AuthenticatedUser } from "./auth"

// Security middleware configuration
interface SecurityConfig {
  enableCSRF?: boolean
  enableRateLimit?: boolean
  enableSecurityHeaders?: boolean
  enableAuthentication?: boolean | 'read-only' // true = enforce, 'read-only' = read for logging only
  enableLogging?: boolean
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableCSRF: true,
  enableRateLimit: true, 
  enableSecurityHeaders: true,
  enableAuthentication: true,
  enableLogging: true
}

/**
 * Main security middleware that orchestrates all security measures
 */
export async function applySecurity(
  request: NextRequest,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<NextResponse> {
  const startTime = Date.now()
  const url = new URL(request.url)
  
  try {
    // Step 1: Apply security headers and CORS (first, as they may handle OPTIONS requests)
    if (config.enableSecurityHeaders) {
      const securityResponse = securityMiddleware(request)
      
      // If this is a preflight request, return early
      if (request.method === 'OPTIONS') {
        return securityResponse
      }
    }
    
    // Step 2: Authentication (extract user for rate limiting and other security measures)
    let user: AuthenticatedUser | null = null
    let authResponse: NextResponse | null = null
    
    if (config.enableAuthentication) {
      const authResult = await authMiddleware(request)
      user = authResult.user
      authResponse = authResult.response
      
      // If auth middleware returned a response (redirect/error), handle it
      // But skip enforcement if in read-only mode (let Supabase handle auth)
      if (authResponse && config.enableAuthentication !== 'read-only') {
        return authResponse
      }
    }
    
    // Step 3: Rate limiting (uses user ID if available)
    if (config.enableRateLimit) {
      const userId = user?.id || await extractUserId(request)
      const rateLimitResponse = rateLimitMiddleware(request, userId)
      
      if (rateLimitResponse) {
        // Log rate limit violation
        if (config.enableLogging) {
          logSecurityEvent('RATE_LIMIT_EXCEEDED', request, { userId })
        }
        return rateLimitResponse
      }
    }
    
    // Step 4: CSRF protection (for state-changing operations)
    if (config.enableCSRF) {
      const csrfResponse = csrfProtection(request)
      
      if (csrfResponse) {
        // Log CSRF violation
        if (config.enableLogging) {
          logSecurityEvent('CSRF_VIOLATION', request, { userId: user?.id })
        }
        return csrfResponse
      }
    }
    
    // Step 5: Create the main response (continue to the actual route)
    let response = NextResponse.next()
    
    // Step 6: Apply security headers to the response
    if (config.enableSecurityHeaders) {
      response = securityMiddleware(request, response)
    }
    
    // Step 7: Add CSRF token to response (for legitimate requests)
    if (config.enableCSRF) {
      response = addCSRFToken(response, request)
    }
    
    // Step 8: Add rate limit headers to response
    if (config.enableRateLimit) {
      const userId = user?.id || await extractUserId(request)
      response = addRateLimitHeaders(response, request, {
        windowMs: userId ? 60 * 60 * 1000 : 60 * 60 * 1000,
        maxRequests: userId ? 1000 : 100
      }, userId)
    }
    
    // Step 9: Update user activity (if authenticated)
    if (user && config.enableAuthentication) {
      await updateUserActivity(request, user.id)
    }
    
    // Step 10: Log successful request (in development or for monitoring)
    if (config.enableLogging && process.env.NODE_ENV === 'development') {
      const processingTime = Date.now() - startTime
      console.log(`Security middleware: ${request.method} ${url.pathname} - ${processingTime}ms`, {
        authenticated: !!user,
        userId: user?.id
      })
    }
    
    return response
    
  } catch (error) {
    console.error('Security middleware error:', error)
    
    // Log security error
    if (config.enableLogging) {
      logSecurityEvent('SECURITY_MIDDLEWARE_ERROR', request, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user?.id
      })
    }
    
    // Return a generic error response
    return NextResponse.json(
      { error: 'Security validation failed' },
      { status: 500 }
    )
  }
}

/**
 * Enhanced security middleware with custom configuration
 */
export function createSecurityMiddleware(config: Partial<SecurityConfig> = {}) {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config }
  
  return async (request: NextRequest) => {
    return applySecurity(request, finalConfig)
  }
}

/**
 * API route wrapper that applies security measures
 */
export function withSecurity<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse,
  config: Partial<SecurityConfig> = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Apply security middleware first
    const securityResult = await applySecurity(request, { ...DEFAULT_SECURITY_CONFIG, ...config })
    
    // If security middleware returned a response (error/redirect), return it
    if (securityResult.status !== 200 || securityResult.headers.get('location')) {
      return securityResult
    }
    
    try {
      // Execute the original handler
      const result = await handler(request, ...args)
      
      // Apply security headers to the result
      if (config.enableSecurityHeaders !== false) {
        return securityMiddleware(request, result)
      }
      
      return result
    } catch (error) {
      console.error('API handler error:', error)
      
      // Log API error
      if (config.enableLogging !== false) {
        logSecurityEvent('API_HANDLER_ERROR', request, {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Security context for use in API routes
 */
export interface SecurityContext {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  csrfToken: string | null
  rateLimitStatus: {
    count: number
    limit: number
    remaining: number
    resetTime: number
  }
  request: NextRequest
}

/**
 * Get security context for current request
 */
export async function getSecurityContext(request: NextRequest): Promise<SecurityContext> {
  const { user } = await authMiddleware(request)
  const userId = user?.id || await extractUserId(request)
  
  return {
    user: user,
    isAuthenticated: !!user,
    csrfToken: request.headers.get('x-csrf-token'),
    rateLimitStatus: {
      count: 0, // This would need to be implemented based on rate limit store
      limit: user ? 1000 : 100,
      remaining: user ? 1000 : 100,
      resetTime: Date.now() + (60 * 60 * 1000)
    },
    request
  }
}

// Re-export individual security functions for direct use
export {
  csrfProtection,
  addCSRFToken
} from './csrf'
export {
  rateLimitMiddleware,
  addRateLimitHeaders
} from './rate-limit'
export {
  securityMiddleware,
  logSecurityEvent
} from './headers'
export {
  authMiddleware,
  extractUserId
} from './auth'