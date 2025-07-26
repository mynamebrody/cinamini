import { NextRequest, NextResponse } from "next/server"
import { withSecurity, SecurityContext, getSecurityContext } from "./index"
import { createClient } from "@/lib/supabase/server"

// Enhanced API handler type with security context
export type SecureAPIHandler = (
  request: NextRequest,
  context: SecurityContext,
  params?: any
) => Promise<NextResponse> | NextResponse

// Configuration for secure API routes
interface SecureAPIConfig {
  requireAuth?: boolean
  requireCSRF?: boolean
  enableRateLimit?: boolean
  methods?: string[]
  adminOnly?: boolean
}

/**
 * Wrapper for API routes that provides security context and validation
 */
export function createSecureAPIRoute(
  handler: SecureAPIHandler,
  config: SecureAPIConfig = {}
) {
  const {
    requireAuth = false,
    requireCSRF = true,
    enableRateLimit = true,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    adminOnly = false
  } = config

  return withSecurity(async (request: NextRequest, params?: any) => {
    // Check if method is allowed
    if (!methods.includes(request.method)) {
      return NextResponse.json(
        { error: `Method ${request.method} not allowed` },
        { status: 405, headers: { Allow: methods.join(', ') } }
      )
    }

    // Get security context
    const context = await getSecurityContext(request)

    // Check authentication requirement
    if (requireAuth && !context.isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Check admin requirement
    if (adminOnly && (!context.user || context.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Admin access required', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      )
    }

    // CSRF validation for state-changing methods
    if (requireCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      if (!context.csrfToken) {
        return NextResponse.json(
          { error: 'CSRF token required', code: 'CSRF_REQUIRED' },
          { status: 403 }
        )
      }
    }

    try {
      // Call the actual handler with security context
      return await handler(request, context, params)
    } catch (error) {
      console.error('Secure API handler error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }, {
    enableCSRF: requireCSRF,
    enableRateLimit: enableRateLimit,
    enableSecurityHeaders: true,
    enableAuthentication: requireAuth,
    enableLogging: true
  })
}

/**
 * Helper to create a Supabase client with RLS enforcement
 */
export async function createSecureSupabaseClient(context: SecurityContext) {
  const supabase = await createClient()
  
  // If user is authenticated, the client will automatically use their JWT
  // RLS policies will enforce data access based on user ID
  
  return supabase
}

/**
 * Utility to validate request body schema
 */
export function validateRequestBody<T>(
  body: any,
  requiredFields: (keyof T)[],
  optionalFields: (keyof T)[] = []
): { isValid: boolean; errors: string[]; data?: T } {
  const errors: string[] = []
  
  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] }
  }
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === undefined || body[field] === null) {
      errors.push(`Missing required field: ${String(field)}`)
    }
  }
  
  // Check for unexpected fields
  const allowedFields = new Set([...requiredFields, ...optionalFields])
  for (const field in body) {
    if (!allowedFields.has(field as keyof T)) {
      errors.push(`Unexpected field: ${field}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? body as T : undefined
  }
}

/**
 * Standard error responses
 */
export const ErrorResponses = {
  unauthorized: () => NextResponse.json(
    { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    { status: 401 }
  ),
  
  forbidden: (message?: string) => NextResponse.json(
    { error: message || 'Forbidden', code: 'FORBIDDEN' },
    { status: 403 }
  ),
  
  notFound: (resource?: string) => NextResponse.json(
    { error: resource ? `${resource} not found` : 'Not found', code: 'NOT_FOUND' },
    { status: 404 }
  ),
  
  badRequest: (message: string) => NextResponse.json(
    { error: message, code: 'BAD_REQUEST' },
    { status: 400 }
  ),
  
  conflict: (message: string) => NextResponse.json(
    { error: message, code: 'CONFLICT' },
    { status: 409 }
  ),
  
  tooManyRequests: (retryAfter?: number) => {
    const response = NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429 }
    )
    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString())
    }
    return response
  },
  
  internalError: (message?: string) => NextResponse.json(
    { error: message || 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  })
}