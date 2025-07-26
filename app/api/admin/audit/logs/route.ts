import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security"
import AuditLogger, { AuditTrailQuery } from "@/lib/security/audit-logger"
import { authMiddleware } from "@/lib/security/auth"

/**
 * GET /api/admin/audit/logs
 * 
 * Query audit trail logs with filters:
 * - userId: Filter by specific user ID
 * - eventType: Filter by event type  
 * - category: Filter by event category
 * - severity: Filter by severity level
 * - outcome: Filter by outcome (success/failure/partial)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Number of results (default 50, max 1000)
 * - offset: Pagination offset (default 0)
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
    const searchParams = url.searchParams

    // Build query from search parameters
    const query: AuditTrailQuery = {}

    if (searchParams.has('userId')) {
      query.userId = searchParams.get('userId')!
    }

    if (searchParams.has('eventType')) {
      query.eventType = searchParams.get('eventType') as any
    }

    if (searchParams.has('category')) {
      query.category = searchParams.get('category')!
    }

    if (searchParams.has('severity')) {
      query.severity = searchParams.get('severity')!
    }

    if (searchParams.has('outcome')) {
      query.outcome = searchParams.get('outcome')!
    }

    if (searchParams.has('startDate')) {
      query.startDate = new Date(searchParams.get('startDate')!)
    }

    if (searchParams.has('endDate')) {
      query.endDate = new Date(searchParams.get('endDate')!)
    }

    if (searchParams.has('limit')) {
      const limit = parseInt(searchParams.get('limit')!, 10)
      query.limit = Math.min(limit, 1000) // Cap at 1000
    }

    if (searchParams.has('offset')) {
      query.offset = parseInt(searchParams.get('offset')!, 10)
    }

    // Query audit trail
    const result = await AuditLogger.queryAuditTrail(query)

    return NextResponse.json({
      logs: result.logs,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        limit: query.limit || 50,
        offset: query.offset || 0
      }
    })

  } catch (error) {
    console.error("Audit logs query error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to query audit logs",
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