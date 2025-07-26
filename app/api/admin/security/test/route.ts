import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security"
import { authMiddleware } from "@/lib/security/auth"
import { SecurityTestRunner } from "@/lib/security/testing/security-test-helpers"
import VulnerabilityScanner from "@/lib/security/testing/vulnerability-scanner"

/**
 * POST /api/admin/security/test
 * 
 * Run comprehensive security tests and vulnerability scans
 * 
 * Request body:
 * - testType: 'full' | 'quick' | 'vulnerability_scan'
 * - categories?: string[] - specific test categories to run
 * - scanPath?: string - path to scan for vulnerabilities (defaults to project root)
 * 
 * Returns security test results and vulnerability scan
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
    const { 
      testType = 'full',
      categories = [],
      scanPath = process.cwd()
    } = body

    // Validate test type
    if (!['full', 'quick', 'vulnerability_scan'].includes(testType)) {
      return NextResponse.json(
        { error: "Invalid test type. Must be one of: full, quick, vulnerability_scan" },
        { status: 400 }
      )
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      testType,
      userId: user.id
    }

    // Run security tests
    if (testType === 'full' || testType === 'quick') {
      const testRunner = new SecurityTestRunner()
      const securityTestResults = await testRunner.runSecurityScan()
      
      results.securityTests = securityTestResults
    }

    // Run vulnerability scan
    if (testType === 'full' || testType === 'vulnerability_scan') {
      const scanner = new VulnerabilityScanner()
      
      const scanOptions = {
        recursive: true,
        excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
        fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.sql']
      }

      const vulnerabilityScan = await scanner.scanDirectory(scanPath, scanOptions)
      results.vulnerabilityScan = vulnerabilityScan
    }

    // Calculate overall security score
    const securityScore = calculateOverallSecurityScore(results)
    results.overallSecurityScore = securityScore

    // Generate recommendations based on results
    const recommendations = generateSecurityRecommendations(results)
    results.recommendations = recommendations

    return NextResponse.json(results)

  } catch (error) {
    console.error("Security test error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to run security tests",
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

/**
 * GET /api/admin/security/test/history
 * 
 * Get history of security test runs
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

    // In a real implementation, this would query a database
    // For now, return mock history data
    const mockHistory = [
      {
        id: 'test-1',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        testType: 'full',
        overallScore: 85,
        vulnerabilitiesFound: 3,
        criticalIssues: 0,
        runBy: user.id
      },
      {
        id: 'test-2', 
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        testType: 'quick',
        overallScore: 78,
        vulnerabilitiesFound: 5,
        criticalIssues: 1,
        runBy: user.id
      }
    ]

    return NextResponse.json({
      history: mockHistory,
      totalRuns: mockHistory.length
    })

  } catch (error) {
    console.error("Security test history error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to get security test history",
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

/**
 * Calculate overall security score from test results
 */
function calculateOverallSecurityScore(results: any): number {
  let totalScore = 0
  let scoreCount = 0

  // Include security test score
  if (results.securityTests?.overallScore) {
    totalScore += results.securityTests.overallScore
    scoreCount++
  }

  // Calculate vulnerability scan score
  if (results.vulnerabilityScan) {
    const vulnScan = results.vulnerabilityScan
    let vulnScore = 100

    // Deduct points based on severity
    vulnScore -= (vulnScan.vulnerabilitiesBySeverity.critical || 0) * 20
    vulnScore -= (vulnScan.vulnerabilitiesBySeverity.high || 0) * 10
    vulnScore -= (vulnScan.vulnerabilitiesBySeverity.medium || 0) * 5
    vulnScore -= (vulnScan.vulnerabilitiesBySeverity.low || 0) * 2

    vulnScore = Math.max(0, vulnScore)
    totalScore += vulnScore
    scoreCount++
  }

  return scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
}

/**
 * Generate security recommendations based on test results
 */
function generateSecurityRecommendations(results: any): string[] {
  const recommendations = new Set<string>()

  // Add recommendations from security tests
  if (results.securityTests?.recommendations) {
    results.securityTests.recommendations.forEach((rec: string) => 
      recommendations.add(rec)
    )
  }

  // Add recommendations based on vulnerability scan
  if (results.vulnerabilityScan) {
    const vulnScan = results.vulnerabilityScan

    if (vulnScan.vulnerabilitiesBySeverity.critical > 0) {
      recommendations.add('Address critical security vulnerabilities immediately')
      recommendations.add('Conduct thorough security code review')
    }

    if (vulnScan.vulnerabilitiesBySeverity.high > 0) {
      recommendations.add('Fix high-severity security issues before deployment')
    }

    if (vulnScan.totalVulnerabilities > 10) {
      recommendations.add('Implement automated security scanning in CI/CD pipeline')
      recommendations.add('Provide security training for development team')
    }

    // Specific recommendations based on vulnerability types
    const allVulns = [
      ...vulnScan.summary.critical,
      ...vulnScan.summary.high,
      ...vulnScan.summary.medium
    ]

    const vulnTypes = new Set(allVulns.map(v => v.type.toLowerCase()))

    if (vulnTypes.has('potential sql injection')) {
      recommendations.add('Implement parameterized queries for all database operations')
    }

    if (vulnTypes.has('potential xss vulnerability')) {
      recommendations.add('Implement comprehensive input sanitization and output encoding')
    }

    if (vulnTypes.has('hardcoded secret')) {
      recommendations.add('Move all secrets to environment variables or secure vaults')
    }

    if (vulnTypes.has('weak cryptographic algorithm')) {
      recommendations.add('Upgrade to modern cryptographic algorithms (SHA-256+, AES-256)')
    }
  }

  // Add general recommendations based on overall score
  if (results.overallSecurityScore < 70) {
    recommendations.add('Comprehensive security audit recommended')
    recommendations.add('Consider engaging external security consultants')
  } else if (results.overallSecurityScore < 85) {
    recommendations.add('Regular security reviews and updates needed')
  }

  return Array.from(recommendations)
}

export const dynamic = 'force-dynamic'