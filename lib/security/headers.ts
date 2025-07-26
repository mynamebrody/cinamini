import { NextRequest, NextResponse } from "next/server"

// Security headers configuration
interface SecurityHeadersConfig {
  contentSecurityPolicy?: string
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  contentTypeOptions?: boolean
  referrerPolicy?: string
  permissionsPolicy?: string
  hsts?: {
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
}

// CORS configuration
interface CORSConfig {
  origin?: string | string[] | boolean
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
  preflightContinue?: boolean
  optionsSuccessStatus?: number
}

// Default security headers
const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  // Content Security Policy - strict but functional for the app
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval in dev
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https: blob:", // Allow TMDB images and data URLs
    "font-src 'self' data:",
    "connect-src 'self' https://api.themoviedb.org https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions Policy to limit browser features
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()', // Disable FLoC
    'payment=()',
    'usb=()',
    'battery=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()'
  ].join(', '),
  
  // HSTS for production
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}

// Default CORS configuration
const DEFAULT_CORS_CONFIG: CORSConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || false 
    : true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-CSRF-Token'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
}

/**
 * Check if origin is allowed based on CORS config
 */
function isOriginAllowed(origin: string | null, corsConfig: CORSConfig): boolean {
  if (!corsConfig.origin) {
    return false
  }
  
  if (corsConfig.origin === true) {
    return true
  }
  
  if (typeof corsConfig.origin === 'string') {
    return corsConfig.origin === origin
  }
  
  if (Array.isArray(corsConfig.origin)) {
    return corsConfig.origin.includes(origin || '')
  }
  
  return false
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): NextResponse {
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', config.contentSecurityPolicy)
  }
  
  // X-Frame-Options
  if (config.frameOptions) {
    response.headers.set('X-Frame-Options', config.frameOptions)
  }
  
  // X-Content-Type-Options
  if (config.contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
  }
  
  // Referrer Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy)
  }
  
  // Permissions Policy
  if (config.permissionsPolicy) {
    response.headers.set('Permissions-Policy', config.permissionsPolicy)
  }
  
  // HSTS (only for HTTPS)
  if (config.hsts && process.env.NODE_ENV === 'production') {
    const hstsValue = [
      `max-age=${config.hsts.maxAge}`,
      config.hsts.includeSubDomains ? 'includeSubDomains' : '',
      config.hsts.preload ? 'preload' : ''
    ].filter(Boolean).join('; ')
    
    response.headers.set('Strict-Transport-Security', hstsValue)
  }
  
  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  return response
}

/**
 * Handle CORS preflight and requests
 */
export function applyCORS(
  request: NextRequest,
  response?: NextResponse,
  config: CORSConfig = DEFAULT_CORS_CONFIG
): NextResponse {
  const origin = request.headers.get('origin')
  const method = request.method.toUpperCase()
  
  // Create response if not provided (for preflight requests)
  if (!response) {
    response = new NextResponse(null, { status: config.optionsSuccessStatus || 200 })
  }
  
  // Check if origin is allowed
  const originAllowed = isOriginAllowed(origin, config)
  
  if (originAllowed) {
    if (typeof config.origin === 'string') {
      response.headers.set('Access-Control-Allow-Origin', config.origin)
    } else if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
  }
  
  // Credentials
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  // Vary header
  if (config.origin !== true && config.origin !== false) {
    response.headers.set('Vary', 'Origin')
  }
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    // Methods
    if (config.methods) {
      response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '))
    }
    
    // Headers
    const requestHeaders = request.headers.get('access-control-request-headers')
    if (requestHeaders && config.allowedHeaders) {
      const allowedHeadersLower = config.allowedHeaders.map(h => h.toLowerCase())
      const requestedHeadersLower = requestHeaders.toLowerCase().split(',').map(h => h.trim())
      
      if (requestedHeadersLower.every(header => allowedHeadersLower.includes(header))) {
        response.headers.set('Access-Control-Allow-Headers', requestHeaders)
      }
    } else if (config.allowedHeaders) {
      response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))
    }
    
    // Max Age
    if (config.maxAge) {
      response.headers.set('Access-Control-Max-Age', config.maxAge.toString())
    }
  } else {
    // Expose headers for actual requests
    if (config.exposedHeaders) {
      response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
    }
  }
  
  return response
}

/**
 * Security middleware that applies both security headers and CORS
 */
export function securityMiddleware(
  request: NextRequest,
  response?: NextResponse
): NextResponse {
  const url = new URL(request.url)
  const isApiRoute = url.pathname.startsWith('/api/')
  
  // Handle CORS for API routes
  if (isApiRoute) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return applyCORS(request, undefined, DEFAULT_CORS_CONFIG)
    }
    
    // Apply CORS to existing response or create new one
    if (response) {
      response = applyCORS(request, response, DEFAULT_CORS_CONFIG)
    }
  }
  
  // Apply security headers to all responses
  if (!response) {
    response = NextResponse.next()
  }
  
  response = applySecurityHeaders(response, DEFAULT_SECURITY_HEADERS)
  
  return response
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  event: string,
  request: NextRequest,
  details?: Record<string, any>
): void {
  if (process.env.NODE_ENV === 'production') {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.ip,
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      ...details
    }
    
    // In production, you might want to send this to a logging service
    console.warn('Security Event:', JSON.stringify(logData))
  } else {
    console.log(`Security Event: ${event}`, { url: request.url, method: request.method, ...details })
  }
}