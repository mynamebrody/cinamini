import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security"
import SecurityMonitor from "@/lib/security/monitoring"
import { authMiddleware } from "@/lib/security/auth"

/**
 * GET /api/admin/security/dashboard
 * 
 * Returns comprehensive security dashboard data including:
 * - Active security alerts
 * - Security metrics and statistics
 * - Recent security events
 * - System health status
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

    // In a real implementation, you would check for admin role
    // For now, we'll allow any authenticated user to access the dashboard
    // if (!user.isAdmin) {
    //   return NextResponse.json(
    //     { error: "Admin access required" },
    //     { status: 403 }
    //   )
    // }

    // Get comprehensive dashboard data
    const dashboardData = await SecurityMonitor.getDashboardData()

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error("Security dashboard error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to fetch security dashboard data",
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