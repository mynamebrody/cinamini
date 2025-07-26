import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'

// Authentication configuration
interface AuthConfig {
  publicRoutes: string[]
  protectedRoutes: string[]
  adminRoutes: string[]
  requireEmailVerification?: boolean
  sessionTimeout?: number // in milliseconds
}

// Default authentication configuration
const DEFAULT_AUTH_CONFIG: AuthConfig = {
  publicRoutes: [
    '/auth/login',
    '/auth/sign-up',
    '/auth/callback',
    '/api/auth',
    '/api/games',
    '/api/retitled/puzzle/today',
    '/api/budget-bracket/puzzle/today',
    '/api/movies/search',
    '/' // Home page
  ],
  protectedRoutes: [
    '/profile',
    '/game',
    '/api/user',
    '/api/retitled/guess',
    '/api/retitled/stats',
    '/api/budget-bracket/guess',
    '/api/budget-bracket/stats',
    '/api/budget-bracket/submit-game'
  ],
  adminRoutes: [
    '/admin',
    '/api/admin'
  ],
  requireEmailVerification: false,
  sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
}

// User roles and permissions
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator', 
  ADMIN = 'admin'
}

export interface AuthenticatedUser extends User {
  role?: UserRole
  permissions?: string[]
  lastActivity?: Date
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  )
}

/**
 * Create a Supabase client for middleware use
 */
function createSupabaseClient(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase configuration missing')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        },
      },
    }
  )
}

/**
 * Validate and refresh user session
 */
export async function validateUserSession(request: NextRequest): Promise<{
  user: AuthenticatedUser | null
  error: string | null
  needsRefresh: boolean
}> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Authentication not configured', needsRefresh: false }
  }

  try {
    const supabase = createSupabaseClient(request)
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session validation error:', sessionError)
      return { user: null, error: sessionError.message, needsRefresh: false }
    }
    
    if (!session) {
      return { user: null, error: null, needsRefresh: false }
    }
    
    // Check if session is expired or needs refresh
    const now = Date.now() / 1000
    const expiresAt = session.expires_at || 0
    const refreshThreshold = 300 // 5 minutes before expiry
    
    if (now > expiresAt) {
      return { user: null, error: 'Session expired', needsRefresh: true }
    }
    
    const needsRefresh = (expiresAt - now) < refreshThreshold
    
    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { user: null, error: userError?.message || 'User not found', needsRefresh }
    }
    
    // Check email verification if required
    if (DEFAULT_AUTH_CONFIG.requireEmailVerification && !user.email_confirmed_at) {
      return { user: null, error: 'Email verification required', needsRefresh: false }
    }
    
    // Get user role and permissions from user metadata or database
    const authenticatedUser: AuthenticatedUser = {
      ...user,
      role: (user.user_metadata?.role as UserRole) || UserRole.USER,
      permissions: user.user_metadata?.permissions || [],
      lastActivity: new Date()
    }
    
    return { user: authenticatedUser, error: null, needsRefresh }
    
  } catch (error) {
    console.error('Authentication error:', error)
    return { user: null, error: 'Authentication failed', needsRefresh: false }
  }
}

/**
 * Check if route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string, config: AuthConfig = DEFAULT_AUTH_CONFIG): boolean {
  return config.publicRoutes.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1))
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

/**
 * Check if route is protected (requires authentication)
 */
function isProtectedRoute(pathname: string, config: AuthConfig = DEFAULT_AUTH_CONFIG): boolean {
  return config.protectedRoutes.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1))
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

/**
 * Check if route requires admin access
 */
function isAdminRoute(pathname: string, config: AuthConfig = DEFAULT_AUTH_CONFIG): boolean {
  return config.adminRoutes.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1))
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

/**
 * Check if user has required role/permissions
 */
export function hasPermission(user: AuthenticatedUser, requiredRole: UserRole): boolean {
  if (!user.role) return false
  
  const roleHierarchy = {
    [UserRole.USER]: 0,
    [UserRole.MODERATOR]: 1,
    [UserRole.ADMIN]: 2
  }
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

/**
 * Main authentication middleware
 */
export async function authMiddleware(request: NextRequest): Promise<{
  response: NextResponse | null
  user: AuthenticatedUser | null
}> {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Skip authentication for public routes
  if (isPublicRoute(pathname)) {
    return { response: null, user: null }
  }
  
  // Validate user session
  const { user, error, needsRefresh } = await validateUserSession(request)
  
  // Handle authentication failures
  if (error && (isProtectedRoute(pathname) || isAdminRoute(pathname))) {
    console.warn(`Authentication failed for ${pathname}: ${error}`)
    
    // Redirect to login for web routes
    if (!pathname.startsWith('/api/')) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return { response: NextResponse.redirect(loginUrl), user: null }
    }
    
    // Return 401 for API routes
    return {
      response: NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
      user: null
    }
  }
  
  // Check admin permissions
  if (isAdminRoute(pathname) && user && !hasPermission(user, UserRole.ADMIN)) {
    console.warn(`Insufficient permissions for ${pathname}: user role ${user.role}`)
    
    if (!pathname.startsWith('/api/')) {
      return { response: NextResponse.redirect(new URL('/', request.url)), user }
    }
    
    return {
      response: NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      ),
      user
    }
  }
  
  // Handle session refresh if needed
  if (needsRefresh && user) {
    // For now, just log it. In a more advanced setup, you might trigger a refresh
    console.log('User session needs refresh:', user.id)
  }
  
  return { response: null, user }
}

/**
 * Extract user ID from session for rate limiting and logging
 */
export async function extractUserId(request: NextRequest): Promise<string | undefined> {
  try {
    const { user } = await validateUserSession(request)
    return user?.id
  } catch (error) {
    console.error('Error extracting user ID:', error)
    return undefined
  }
}

/**
 * Update user's last activity timestamp
 */
export async function updateUserActivity(request: NextRequest, userId: string): Promise<void> {
  // This could update a database record or cache
  // For now, we'll just log it in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`User activity updated: ${userId} at ${new Date().toISOString()}`)
  }
}

/**
 * Helper to check if user has specific permission
 */
export function checkPermission(user: AuthenticatedUser | null, permission: string): boolean {
  if (!user) return false
  return user.permissions?.includes(permission) || hasPermission(user, UserRole.ADMIN)
}

/**
 * Helper to get user info for API responses
 */
export function getUserInfo(user: AuthenticatedUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: !!user.email_confirmed_at,
    lastSignIn: user.last_sign_in_at,
    createdAt: user.created_at
  }
}