import { NextRequest, NextResponse } from "next/server"

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipPaths?: string[] // Paths to skip rate limiting
  skipSuccessfulRequests?: boolean // Don't count successful requests
  keyGenerator?: (request: NextRequest) => string // Custom key generator
}

// Default configurations for different user types
const DEFAULT_CONFIGS = {
  unauthenticated: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    skipPaths: ['/api/auth', '/api/games', '/api/retitled/puzzle/today'],
  },
  authenticated: {
    windowMs: 60 * 60 * 1000, // 1 hour  
    maxRequests: 1000,
    skipPaths: ['/api/auth'],
  },
  // More restrictive for write operations
  write: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
  }
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed systems
interface RateLimitEntry {
  count: number
  resetTime: number
  lastRequest: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Simple hash function for IP addresses (Edge Runtime compatible)
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Generate a key for rate limiting based on IP and user ID
 */
function generateRateLimitKey(request: NextRequest, userId?: string): string {
  // Use user ID if available, otherwise fall back to IP
  if (userId) {
    return `user:${userId}`
  }
  
  // Get IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
  
  return `ip:${simpleHash(ip)}`
}

/**
 * Check if request should be rate limited
 */
function shouldRateLimit(request: NextRequest, config: RateLimitConfig): boolean {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Skip rate limiting for specified paths
  if (config.skipPaths?.some(skipPath => path.startsWith(skipPath))) {
    return false
  }
  
  // Skip rate limiting for static assets
  if (path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return false
  }
  
  return true
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
  request: NextRequest, 
  config: RateLimitConfig,
  userId?: string
): NextResponse | null {
  if (!shouldRateLimit(request, config)) {
    return null
  }
  
  const key = config.keyGenerator ? config.keyGenerator(request) : generateRateLimitKey(request, userId)
  const now = Date.now()
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)
  
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      lastRequest: now
    }
    rateLimitStore.set(key, entry)
  }
  
  // Reset if window has expired
  if (now > entry.resetTime) {
    entry.count = 0
    entry.resetTime = now + config.windowMs
  }
  
  // Increment request count
  entry.count++
  entry.lastRequest = now
  
  // Calculate remaining time
  const remainingTime = Math.max(0, Math.ceil((entry.resetTime - now) / 1000))
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    console.warn(`Rate limit exceeded for key: ${key}, count: ${entry.count}, limit: ${config.maxRequests}`)
    
    const response = NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: remainingTime
      },
      { status: 429 }
    )
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
    response.headers.set('Retry-After', remainingTime.toString())
    
    return response
  }
  
  return null // No rate limiting response needed
}

/**
 * Add rate limit headers to successful responses
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): NextResponse {
  if (!shouldRateLimit(request, config)) {
    return response
  }
  
  const key = config.keyGenerator ? config.keyGenerator(request) : generateRateLimitKey(request, userId)
  const entry = rateLimitStore.get(key)
  
  if (entry) {
    const remaining = Math.max(0, config.maxRequests - entry.count)
    
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
  }
  
  return response
}

/**
 * Main rate limiting middleware function
 */
export function rateLimitMiddleware(request: NextRequest, userId?: string): NextResponse | null {
  const url = new URL(request.url)
  const isApiRoute = url.pathname.startsWith('/api/')
  
  if (!isApiRoute) {
    return null // Only rate limit API routes
  }
  
  // Determine which config to use
  let config: RateLimitConfig
  
  // More restrictive for write operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    config = { ...DEFAULT_CONFIGS.write }
  } else if (userId) {
    config = { ...DEFAULT_CONFIGS.authenticated }
  } else {
    config = { ...DEFAULT_CONFIGS.unauthenticated }
  }
  
  return applyRateLimit(request, config, userId)
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(request: NextRequest, userId?: string) {
  const key = generateRateLimitKey(request, userId)
  const entry = rateLimitStore.get(key)
  
  if (!entry) {
    return {
      count: 0,
      limit: userId ? DEFAULT_CONFIGS.authenticated.maxRequests : DEFAULT_CONFIGS.unauthenticated.maxRequests,
      remaining: userId ? DEFAULT_CONFIGS.authenticated.maxRequests : DEFAULT_CONFIGS.unauthenticated.maxRequests,
      resetTime: Date.now() + (userId ? DEFAULT_CONFIGS.authenticated.windowMs : DEFAULT_CONFIGS.unauthenticated.windowMs)
    }
  }
  
  const limit = userId ? DEFAULT_CONFIGS.authenticated.maxRequests : DEFAULT_CONFIGS.unauthenticated.maxRequests
  
  return {
    count: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime
  }
}

/**
 * Clear rate limit for a specific key (useful for testing or admin functions)
 */
export function clearRateLimit(request: NextRequest, userId?: string): void {
  const key = generateRateLimitKey(request, userId)
  rateLimitStore.delete(key)
}