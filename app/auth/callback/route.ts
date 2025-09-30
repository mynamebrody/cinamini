import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  // Try to get redirect from query param first, then from cookie
  let redirect = requestUrl.searchParams.get('redirect')

  if (!redirect) {
    const cookieStore = await cookies()
    const redirectCookie = cookieStore.get('auth_redirect')
    redirect = redirectCookie?.value || null
  }

  // Helper function to get the correct base URL
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      return 'https://cinamini.app'
    }
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        // If there's a redirect param, use it regardless of type
        if (redirect) {
          const response = NextResponse.redirect(new URL(redirect, getBaseUrl()))
          response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
          response.headers.set('Pragma', 'no-cache')
          response.headers.set('Expires', '0')
          // Clear the redirect cookie
          response.cookies.delete('auth_redirect')
          return response
        }

        // If this is a password recovery flow, redirect to reset password page
        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/auth/reset-password', getBaseUrl()))
        }

        // If this is an email confirmation flow, go to profile
        if (type === 'signup') {
          const response = NextResponse.redirect(new URL('/profile?emailConfirmed=true', getBaseUrl()))
          response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
          response.headers.set('Pragma', 'no-cache')
          response.headers.set('Expires', '0')
          return response
        }

        // Default redirect to home
        const response = NextResponse.redirect(new URL('/', getBaseUrl()))
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/auth/login', getBaseUrl()))
}