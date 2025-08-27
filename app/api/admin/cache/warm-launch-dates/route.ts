import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { warmUpLaunchDateCache, getLaunchDateCacheStats } from '@/lib/puzzle-numbering'

/**
 * Admin endpoint to warm up the launch date cache
 * This can be called to proactively improve performance
 */
export async function POST() {
  try {
    const supabase = createServiceClient()
    
    // Get cache stats before warming
    const beforeStats = getLaunchDateCacheStats()
    
    // Warm up the cache
    await warmUpLaunchDateCache(supabase)
    
    // Get cache stats after warming
    const afterStats = getLaunchDateCacheStats()
    
    return NextResponse.json({
      success: true,
      message: 'Launch date cache warmed up successfully',
      before: beforeStats,
      after: afterStats
    })
  } catch (error) {
    console.error('Failed to warm up launch date cache:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to warm up cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get current cache statistics
 */
export async function GET() {
  try {
    const stats = getLaunchDateCacheStats()
    
    return NextResponse.json({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache stats'
      },
      { status: 500 }
    )
  }
}