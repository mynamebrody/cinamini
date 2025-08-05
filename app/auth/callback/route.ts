import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const confirmed = requestUrl.searchParams.get('confirmed')

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
        // If this is a password recovery flow, redirect to reset password page
        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin))
        }
        
        // If this is an email confirmation flow, redirect to profile with confirmation message
        if (confirmed === 'true') {
          return NextResponse.redirect(new URL('/profile?emailConfirmed=true', requestUrl.origin))
        }
        
        // Otherwise redirect to home page after successful auth
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}