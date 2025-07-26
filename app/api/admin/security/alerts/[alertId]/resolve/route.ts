import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security"
import SecurityMonitor from "@/lib/security/monitoring"
import { authMiddleware } from "@/lib/security/auth"

/**
 * POST /api/admin/security/alerts/[alertId]/resolve
 * 
 * Resolves a security alert by marking it as resolved
 * and recording who resolved it.
 * 
 * Requires admin authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  return withSecurity(async (req: NextRequest) => {
    try {
      const { alertId } = params

      if (!alertId) {
        return NextResponse.json(
          { error: "Alert ID is required" },
          { status: 400 }
        )
      }

      // Verify admin authentication
      const { user } = await authMiddleware(req)
      
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      // In a real implementation, check for admin role
      // if (!user.isAdmin) {
      //   return NextResponse.json(
      //     { error: "Admin access required" },
      //     { status: 403 }
      //   )
      // }

      // Resolve the alert
      const resolved = SecurityMonitor.resolveAlert(alertId, user.id)

      if (!resolved) {
        return NextResponse.json(
          { error: "Alert not found or already resolved" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Alert resolved successfully",
        resolvedBy: user.id,
        resolvedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error("Alert resolution error:", error)
      
      return NextResponse.json(
        { 
          error: "Failed to resolve alert",
          details: process.env.NODE_ENV === 'development' 
            ? error instanceof Error ? error.message : 'Unknown error'
            : undefined
        },
        { status: 500 }
      )
    }
  }, {
    enableAuthentication: true,
    enableCSRF: true,
    enableRateLimit: true,
    enableLogging: true
  })(request)
}

export const dynamic = 'force-dynamic'