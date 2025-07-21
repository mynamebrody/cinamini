import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if TMDB API key is configured
    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'TMDB_API_KEY environment variable is not set',
        apiKeyPresent: false,
      })
    }

    const apiKey = process.env.TMDB_API_KEY
    console.log('API Key length:', apiKey.length)
    console.log('API Key first 10 chars:', apiKey.substring(0, 10))

    // Test TMDB API with a simple configuration request
    const testUrl = 'https://api.themoviedb.org/3/configuration'
    
    console.log('Testing TMDB API connection...')
    
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
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      responseData: testResponse.ok ? 'Configuration loaded successfully' : responseData,
    })

  } catch (error) {
    console.error('TMDB debug error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      apiKeyPresent: !!process.env.TMDB_API_KEY,
    })
  }
} 