import { updateSession } from "@/lib/supabase/middleware"
import { applySecurity } from "@/lib/security"
import type { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // For local development, you can disable CSRF entirely
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Skip CSRF for authentication routes and logout actions (or all of dev)
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/')
  const isRootLogout = request.nextUrl.pathname === '/' && request.method === 'POST'
  
  // Apply comprehensive security middleware first
  const securityResponse = await applySecurity(request, {
    enableCSRF: !isDevelopment && !isAuthRoute && !isRootLogout, // Disable CSRF in development
    enableRateLimit: !isDevelopment, // Disable rate limiting in development too
    enableSecurityHeaders: true, // Keep security headers
    enableAuthentication: false, // Let Supabase handle auth for now
    enableLogging: isDevelopment // Keep logging in development for debugging
  })
  
  // If security middleware returned a response (error/redirect), return it
  if (securityResponse.status !== 200 || securityResponse.headers.get('location')) {
    return securityResponse
  }
  
  // Apply Supabase session management
  const supabaseResponse = await updateSession(request)
  
  // Merge security headers with Supabase response
  if (supabaseResponse) {
    // Copy security headers to the Supabase response
    for (const [key, value] of securityResponse.headers.entries()) {
      if (key.startsWith('x-') || key.startsWith('access-control-') || 
          key.includes('security') || key.includes('policy') || 
          key.includes('frame') || key.includes('content')) {
        supabaseResponse.headers.set(key, value)
      }
    }
    return supabaseResponse
  }
  
  return securityResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
