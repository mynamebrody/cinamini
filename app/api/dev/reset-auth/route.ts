import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Development-only route to clear stale auth cookies
 * Useful after database resets when cookies persist but user records are deleted
 */
export async function GET(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const supabase = await createClient()
    
    // Sign out to clear all auth cookies
    await supabase.auth.signOut()
    
    console.log('🧹 Development auth reset: Cleared all auth cookies')
    
    // Redirect to signup page
    const signupUrl = new URL('/auth/sign-up', request.url)
    signupUrl.searchParams.set('message', 'Auth cookies cleared - please sign up again')
    
    return NextResponse.redirect(signupUrl)
    
  } catch (error) {
    console.error('Error clearing auth cookies:', error)
    return NextResponse.json({ error: 'Failed to clear auth cookies' }, { status: 500 })
  }
}

/**
 * POST method for programmatic clearing (e.g., from dev tools)
 */
export async function POST() {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const supabase = await createClient()
    
    // Sign out to clear all auth cookies
    await supabase.auth.signOut()
    
    console.log('🧹 Development auth reset (API): Cleared all auth cookies')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Auth cookies cleared successfully' 
    })
    
  } catch (error) {
    console.error('Error clearing auth cookies:', error)
    return NextResponse.json({ error: 'Failed to clear auth cookies' }, { status: 500 })
  }
}