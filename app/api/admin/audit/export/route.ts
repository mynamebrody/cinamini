import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security"
import AuditLogger, { AuditTrailQuery } from "@/lib/security/audit-logger"
import { authMiddleware } from "@/lib/security/auth"

/**
 * POST /api/admin/audit/export
 * 
 * Export audit logs for compliance and analysis.
 * 
 * Request body:
 * - query: AuditTrailQuery filters
 * - format: 'json' | 'csv' | 'xml' (default: 'json')
 * 
 * Returns exported data as file download
 * 
 * Requires admin authentication
 */
export const POST = withSecurity(async (request: NextRequest) => {
  try {
    // Verify admin authentication
    const { user } = await authMiddleware(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { query = {}, format = 'json' } = body

    // Validate format
    if (!['json', 'csv', 'xml'].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be one of: json, csv, xml" },
        { status: 400 }
      )
    }

    // Export audit logs
    const exportData = await AuditLogger.exportAuditLogs(query as AuditTrailQuery, format)

    // Set appropriate headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `audit-logs-${timestamp}.${format}`
    
    const contentType = {
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml'
    }[format]

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error("Audit export error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to export audit logs",
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
})

export const dynamic = 'force-dynamic'