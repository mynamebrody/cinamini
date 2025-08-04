import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  
  // Get the correct base URL from environment or use ngrok
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cinamini.ngrok.app'

  if (tokenHash && type) {
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
      // Handle different types of confirmations
      if (type === 'recovery') {
        // For password recovery, verify the OTP token hash
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery'
        })
        
        if (!error) {
          // Redirect to reset password page after successful verification
          return NextResponse.redirect(new URL('/auth/reset-password', baseUrl))
        } else {
          console.error('Error verifying recovery token:', error)
          // Redirect to login with error
          return NextResponse.redirect(new URL('/auth/login?error=invalid_recovery_token', baseUrl))
        }
      } else if (type === 'signup') {
        // For email confirmation during signup
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'signup'
        })
        
        if (!error) {
          // Redirect to home page after successful signup confirmation
          return NextResponse.redirect(new URL('/', baseUrl))
        } else {
          console.error('Error verifying signup token:', error)
          // Redirect to login with error
          return NextResponse.redirect(new URL('/auth/login?error=invalid_signup_token', baseUrl))
        }
      } else if (type === 'email_change') {
        // For email change confirmation
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email_change'
        })
        
        if (!error) {
          // Redirect to profile page after successful email change
          return NextResponse.redirect(new URL('/profile', baseUrl))
        } else {
          console.error('Error verifying email change token:', error)
          // Redirect to login with error
          return NextResponse.redirect(new URL('/auth/login?error=invalid_email_change_token', baseUrl))
        }
      }
    } catch (error) {
      console.error('Error in confirm route:', error)
      return NextResponse.redirect(new URL('/auth/login?error=confirmation_failed', baseUrl))
    }
  }

  // If no token_hash or type, or if we reach here, redirect to login
  return NextResponse.redirect(new URL('/auth/login', baseUrl))
}