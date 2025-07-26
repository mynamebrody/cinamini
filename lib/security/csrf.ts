import { NextRequest, NextResponse } from "next/server"

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_HEADER = "x-csrf-token"
const CSRF_TOKEN_COOKIE = "csrf-token"
const CSRF_SECRET_LENGTH = 64

// Generate a random secret for CSRF token validation
// In production, this should be stored in environment variables
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-secret-change-in-production-for-security'

/**
 * Generate random hex string using Web Crypto API
 */
function generateRandomHex(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Create SHA-256 hash using Web Crypto API
 */
async function createHash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a CSRF token for the current session
 */
export function generateCSRFToken(sessionId?: string): string {
  const timestamp = Date.now().toString()
  const randomValue = generateRandomHex(CSRF_TOKEN_LENGTH)
  const payload = `${timestamp}:${randomValue}:${sessionId || 'anonymous'}`
  
  // For middleware, we'll use a simpler approach without async
  // In production, consider using HMAC with Web Crypto API
  const signature = btoa(`${CSRF_SECRET}:${payload}`).replace(/[+/=]/g, '').substring(0, 32)
  
  return btoa(`${payload}:${signature}`)
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string, sessionId?: string): boolean {
  try {
    const decoded = atob(token)
    const parts = decoded.split(':')
    
    if (parts.length !== 4) {
      return false
    }
    
    const [timestamp, randomValue, tokenSessionId, signature] = parts
    const payload = `${timestamp}:${randomValue}:${tokenSessionId}`
    
    // Verify signature (simplified for middleware compatibility)
    const expectedSignature = btoa(`${CSRF_SECRET}:${payload}`).replace(/[+/=]/g, '').substring(0, 32)
    
    if (signature !== expectedSignature) {
      return false
    }
    
    // Check session ID match (if provided)
    if (sessionId && tokenSessionId !== sessionId && tokenSessionId !== 'anonymous') {
      return false
    }
    
    // Check token age (24 hours max)
    const tokenTime = parseInt(timestamp)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (Date.now() - tokenTime > maxAge) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('CSRF token validation error:', error)
    return false
  }
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase()
  
  // Only protect state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null
  }
  
  // Skip CSRF for auth callbacks and public endpoints
  const url = new URL(request.url)
  const skipPaths = [
    '/api/auth/callback',
    '/auth/callback',
  ]
  
  if (skipPaths.some(path => url.pathname.startsWith(path))) {
    return null
  }
  
  // Get CSRF token from header or body
  let csrfToken = request.headers.get(CSRF_TOKEN_HEADER)
  
  // If not in header, try to get from form data (for form submissions)
  if (!csrfToken && request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
    // Note: We can't easily access form data here without consuming the body
    // So we'll rely on the header for API calls
  }
  
  if (!csrfToken) {
    console.warn(`CSRF token missing for ${method} ${url.pathname}`)
    return NextResponse.json(
      { error: 'CSRF token required' },
      { status: 403 }
    )
  }
  
  // Get session ID from cookies (if available)
  const sessionCookie = request.cookies.get('sb-access-token')
  const sessionId = sessionCookie?.value ? 
    btoa(sessionCookie.value).replace(/[+/=]/g, '').substring(0, 16) : 
    undefined
  
  if (!validateCSRFToken(csrfToken, sessionId)) {
    console.warn(`Invalid CSRF token for ${method} ${url.pathname}`)
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }
  
  return null // No response means continue processing
}

/**
 * Add CSRF token to response headers/cookies
 */
export function addCSRFToken(response: NextResponse, request: NextRequest): NextResponse {
  // Get session ID for token generation
  const sessionCookie = request.cookies.get('sb-access-token')
  const sessionId = sessionCookie?.value ? 
    btoa(sessionCookie.value).replace(/[+/=]/g, '').substring(0, 16) : 
    undefined
  
  const csrfToken = generateCSRFToken(sessionId)
  
  // Add token to response header for JavaScript access
  response.headers.set(CSRF_TOKEN_HEADER, csrfToken)
  
  // Add token as HTTP-only cookie for form submissions
  response.cookies.set(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: false, // Allow JavaScript access for AJAX requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  })
  
  return response
}