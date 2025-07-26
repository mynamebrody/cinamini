import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Security: Only allow debug endpoint in development environment
const isDevelopment = process.env.NODE_ENV === 'development'
const isLocal = process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')

export async function GET(request: NextRequest) {
  try {
    // Security: Block access in production
    if (!isDevelopment && !isLocal) {
      return NextResponse.json({
        status: 'error',
        message: 'Debug endpoint not available in production',
      }, { status: 404 })
    }

    // Security: Require authentication for debug endpoint
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required',
      }, { status: 401 })
    }

    // Security: Only allow specific admin users (if needed)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    if (adminEmails.length > 0 && !adminEmails.includes(session.user.email || '')) {
      return NextResponse.json({
        status: 'error',
        message: 'Admin access required',
      }, { status: 403 })
    }

    // Check if TMDB API key is configured
    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'TMDB_API_KEY environment variable is not set',
        apiKeyPresent: false,
      })
    }

    const apiKey = process.env.TMDB_API_KEY

    // Test TMDB API with a simple configuration request
    const testUrl = 'https://api.themoviedb.org/3/configuration'
    
    const testResponse = await fetch(testUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    const responseData = await testResponse.json()
    
    return NextResponse.json({
      status: testResponse.ok ? 'success' : 'error',
      statusCode: testResponse.status,
      statusText: testResponse.statusText,
      apiKeyPresent: true,
      // Security: Don't expose any part of the actual API key
      apiKeyConfigured: true,
      responseData: testResponse.ok ? 'Configuration loaded successfully' : 'API connection failed',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    // Security: Don't expose detailed error information in production
    const errorMessage = isDevelopment 
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Internal server error'
      
    return NextResponse.json({
      status: 'error',
      message: errorMessage,
      apiKeyPresent: !!process.env.TMDB_API_KEY,
    }, { status: 500 })
  }
} 