import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security"
import AuditLogger from "@/lib/security/audit-logger"
import { authMiddleware } from "@/lib/security/auth"

/**
 * GET /api/admin/audit/statistics
 * 
 * Get audit trail statistics for dashboard:
 * - timeframe: 'hour' | 'day' | 'week' | 'month' (default: 'day')
 * 
 * Returns:
 * - Total events count
 * - Events by type breakdown
 * - Events by category breakdown  
 * - Events by severity breakdown
 * - Events by outcome breakdown
 * - Top users by activity
 * - Timeline data for charts
 * 
 * Requires admin authentication
 */
export const GET = withSecurity(async (request: NextRequest) => {
  try {
    // Verify admin authentication
    const { user } = await authMiddleware(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const timeframe = url.searchParams.get('timeframe') as 'hour' | 'day' | 'week' | 'month' || 'day'

    // Validate timeframe
    if (!['hour', 'day', 'week', 'month'].includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid timeframe. Must be one of: hour, day, week, month" },
        { status: 400 }
      )
    }

    // Get audit statistics
    const statistics = await AuditLogger.getAuditStatistics(timeframe)

    return NextResponse.json({
      timeframe,
      statistics
    })

  } catch (error) {
    console.error("Audit statistics error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to get audit statistics",
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}, {
  enableAuthentication: true,
  enableRateLimit: true,
  enableLogging: true
})

export const dynamic = 'force-dynamic'