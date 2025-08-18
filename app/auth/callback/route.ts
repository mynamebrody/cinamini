import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const confirmed = requestUrl.searchParams.get('confirmed')
  const provider = requestUrl.searchParams.get('provider')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Helper function to get the correct base URL
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      return 'https://cinamini.app'
    }
    return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  // Handle OAuth errors from providers
  if (error) {
    console.error('OAuth error:', { error, errorDescription, provider })
    
    // Map common OAuth errors to user-friendly messages
    let userMessage = 'Authentication failed. Please try again.'
    
    switch (error) {
      case 'access_denied':
        userMessage = 'Authentication was cancelled. Please try again if you want to sign in.'
        break
      case 'invalid_request':
        userMessage = 'Invalid authentication request. Please try again.'
        break
      case 'server_error':
        userMessage = 'Authentication server error. Please try again later.'
        break
      case 'temporarily_unavailable':
        userMessage = 'Authentication service is temporarily unavailable. Please try again later.'
        break
      default:
        if (errorDescription) {
          userMessage = errorDescription
        }
    }
    
    // Redirect to login with error message
    const loginUrl = new URL('/auth/login', getBaseUrl())
    loginUrl.searchParams.set('error', userMessage)
    if (provider) {
      loginUrl.searchParams.set('provider', provider)
    }
    return NextResponse.redirect(loginUrl)
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
      console.log('Attempting to exchange code for session:', {
        code: code ? code.substring(0, 20) + '...' : 'none',
        provider,
        requestUrl: requestUrl.origin + requestUrl.pathname
      })

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data?.session) {
        // Log successful authentication for debugging
        console.log('Successful authentication:', {
          provider,
          userId: data.session.user?.id,
          email: data.session.user?.email
        })
        
        // If this is a password recovery flow, redirect to reset password page
        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/auth/reset-password', getBaseUrl()))
        }
        
        // If this is an email confirmation flow, redirect to profile with confirmation message
        if (confirmed === 'true') {
          return NextResponse.redirect(new URL('/profile?emailConfirmed=true', getBaseUrl()))
        }
        
        // For social provider authentication, redirect to home with success indicator
        if (provider && ['google', 'apple'].includes(provider)) {
          const homeUrl = new URL('/', getBaseUrl())
          homeUrl.searchParams.set('authSuccess', 'true')
          homeUrl.searchParams.set('provider', provider)
          return NextResponse.redirect(homeUrl)
        }
        
        // Otherwise redirect to home page after successful auth
        return NextResponse.redirect(new URL('/', getBaseUrl()))
      }
      
      // Handle authentication errors
      if (error) {
        console.error('Error exchanging code for session:', {
          error: error.message,
          errorCode: error.status,
          provider,
          code: code ? code.substring(0, 10) + '...' : 'none',
          url: requestUrl.href
        })
        
        // Redirect to login with error message
        const loginUrl = new URL('/auth/login', getBaseUrl())
        loginUrl.searchParams.set('error', 'Authentication failed. Please try again.')
        if (provider) {
          loginUrl.searchParams.set('provider', provider)
        }
        return NextResponse.redirect(loginUrl)
      }
      
    } catch (error) {
      console.error('Unexpected error during authentication:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Redirect to login with generic error message
      const loginUrl = new URL('/auth/login', getBaseUrl())
      loginUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.')
      if (provider) {
        loginUrl.searchParams.set('provider', provider)
      }
      return NextResponse.redirect(loginUrl)
    }
  }

  // Handle case where no code is provided
  console.warn('No authorization code provided in callback:', {
    provider,
    hasError: !!error,
    searchParams: Object.fromEntries(requestUrl.searchParams.entries())
  })
  
  // URL to redirect to after sign in process completes or fails
  const loginUrl = new URL('/auth/login', getBaseUrl())
  if (!error) {
    loginUrl.searchParams.set('error', 'Invalid authentication response. Please try again.')
  }
  if (provider) {
    loginUrl.searchParams.set('provider', provider)
  }
  return NextResponse.redirect(loginUrl)
}