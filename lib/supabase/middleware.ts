import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export async function updateSession(request: NextRequest) {
  // If Supabase is not configured, allow all requests to pass through
  if (!isSupabaseConfigured) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Note: Auth callbacks with codes are now handled by /auth/confirm route for PKCE flow
    // This middleware no longer handles exchangeCodeForSession

    // This will refresh session if expired - required for Server Components
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is anonymous
    const isAnonymous = user?.is_anonymous === true

    // Protected routes that require non-anonymous authentication
    const isProtectedRoute = request.nextUrl.pathname.startsWith("/profile") ||
                            request.nextUrl.pathname.startsWith("/stats")
    
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/auth/login") ||
      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
      request.nextUrl.pathname.startsWith("/auth/forgot-password") ||
      request.nextUrl.pathname.startsWith("/auth/reset-password") ||
      request.nextUrl.pathname === "/auth/callback"

    // Redirect anonymous users trying to access protected routes to sign-in
    if (isProtectedRoute && (!user || isAnonymous)) {
      const redirectUrl = new URL("/auth/sign-up", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If non-anonymous user is authenticated and trying to access auth pages, redirect to home
    // Exception: Allow access to reset-password page during recovery flow
    if (isAuthRoute && user && !isAnonymous && !request.nextUrl.pathname.startsWith("/auth/reset-password")) {
      return NextResponse.redirect(new URL("/", request.url))
    }

  } catch (error) {
    console.error("Middleware error:", error)
    // If there's an error, just continue without auth
  }

  return supabaseResponse
}