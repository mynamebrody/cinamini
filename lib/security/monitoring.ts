import { NextRequest } from "next/server"
import { SecurityLogger, SecurityLogEntry, RequestLogEntry } from "../validation/logging"

/**
 * Security event types for monitoring
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  
  // Authorization events
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  
  // Input validation events
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  CSRF_VIOLATION = 'csrf_violation',
  INVALID_INPUT = 'invalid_input',
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DDoS_ATTEMPT = 'ddos_attempt',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  
  // Data access events
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  DATA_EXPORT = 'data_export',
  BULK_DATA_ACCESS = 'bulk_data_access',
  
  // System events
  CONFIGURATION_CHANGE = 'configuration_change',
  SECURITY_POLICY_VIOLATION = 'security_policy_violation',
  SYSTEM_COMPROMISE = 'system_compromise',
  
  // API events
  API_ABUSE = 'api_abuse',
  SUSPICIOUS_API_PATTERN = 'suspicious_api_pattern',
  API_KEY_MISUSE = 'api_key_misuse'
}

/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
  timeframe: string
  totalRequests: number
  securityEvents: number
  blockedRequests: number
  failedLogins: number
  rateLimitViolations: number
  csrfViolations: number
  suspiciousIPs: string[]
  topUserAgents: Array<{ userAgent: string; count: number }>
  errorRate: number
  averageResponseTime: number
}

/**
 * Real-time security alert
 */
export interface SecurityAlert {
  id: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  eventType: SecurityEventType
  title: string
  description: string
  ipAddress: string
  userId?: string
  metadata: Record<string, any>
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
}

/**
 * Security monitoring dashboard data
 */
export interface SecurityDashboardData {
  alerts: SecurityAlert[]
  metrics: SecurityMetrics
  recentEvents: SecurityLogEntry[]
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    lastCheck: string
    issues: string[]
  }
}

/**
 * Security monitoring service
 */
export class SecurityMonitor {
  private static alerts: Map<string, SecurityAlert> = new Map()
  private static metrics: SecurityMetrics | null = null
  private static lastMetricsUpdate = 0
  private static readonly METRICS_CACHE_TTL = 60000 // 1 minute

  /**
   * Create a security alert
   */
  static createAlert(
    eventType: SecurityEventType,
    request: NextRequest,
    context: {
      severity: 'low' | 'medium' | 'high' | 'critical'
      title: string
      description: string
      userId?: string
      metadata?: Record<string, any>
    }
  ): SecurityAlert {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const alert: SecurityAlert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      severity: context.severity,
      eventType,
      title: context.title,
      description: context.description,
      ipAddress: this.extractIPAddress(request),
      userId: context.userId,
      metadata: context.metadata || {},
      resolved: false
    }

    this.alerts.set(alertId, alert)

    // Log the security event
    SecurityLogger.logSecurityEvent(eventType, request, {
      severity: context.severity,
      description: context.description,
      details: context.metadata || {},
      userId: context.userId,
      blocked: context.severity === 'critical'
    })

    // Send immediate notification for critical alerts
    if (context.severity === 'critical') {
      this.sendCriticalAlert(alert)
    }

    return alert
  }

  /**
   * Resolve a security alert
   */
  static resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.resolved = true
    alert.resolvedBy = resolvedBy
    alert.resolvedAt = new Date().toISOString()

    this.alerts.set(alertId, alert)
    return true
  }

  /**
   * Get active security alerts
   */
  static getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        // Sort by severity first, then by timestamp
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
        if (severityDiff !== 0) return severityDiff
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
  }

  /**
   * Get all alerts (including resolved)
   */
  static getAllAlerts(limit = 100): SecurityAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get security metrics
   */
  static async getSecurityMetrics(): Promise<SecurityMetrics> {
    const now = Date.now()
    
    // Return cached metrics if still valid
    if (this.metrics && (now - this.lastMetricsUpdate) < this.METRICS_CACHE_TTL) {
      return this.metrics
    }

    // Calculate new metrics
    const metrics = await this.calculateSecurityMetrics()
    this.metrics = metrics
    this.lastMetricsUpdate = now

    return metrics
  }

  /**
   * Get security dashboard data
   */
  static async getDashboardData(): Promise<SecurityDashboardData> {
    const [alerts, metrics] = await Promise.all([
      Promise.resolve(this.getActiveAlerts()),
      this.getSecurityMetrics()
    ])

    return {
      alerts,
      metrics,
      recentEvents: this.getRecentSecurityEvents(20),
      systemHealth: await this.getSystemHealth()
    }
  }

  /**
   * Monitor for suspicious patterns
   */
  static monitorSuspiciousActivity(request: NextRequest, context: {
    userId?: string
    sessionId?: string
    endpoint: string
    responseTime: number
    statusCode: number
  }): void {
    const ipAddress = this.extractIPAddress(request)
    const userAgent = request.headers.get('user-agent') || ''

    // Check for rapid successive requests (potential brute force)
    this.checkBruteForceAttempt(ipAddress, context.endpoint)

    // Check for suspicious user agents
    this.checkSuspiciousUserAgent(userAgent, request)

    // Check for unusual response times (potential probing)
    this.checkUnusualResponseTime(context.responseTime, context.endpoint, request)

    // Check for error patterns
    this.checkErrorPatterns(context.statusCode, ipAddress, request)
  }

  /**
   * Track failed login attempts
   */
  static trackFailedLogin(request: NextRequest, context: {
    username?: string
    reason: string
  }): void {
    const ipAddress = this.extractIPAddress(request)
    const key = `failed_login:${ipAddress}`
    
    // In a real implementation, this would use Redis or similar
    // For now, we'll use in-memory tracking with cleanup
    const failedAttempts = this.getFailedAttempts(key)
    
    if (failedAttempts >= 5) {
      this.createAlert(SecurityEventType.BRUTE_FORCE_ATTEMPT, request, {
        severity: 'high',
        title: 'Brute Force Attack Detected',
        description: `Multiple failed login attempts from IP ${ipAddress}`,
        metadata: {
          ipAddress,
          username: context.username,
          reason: context.reason,
          attempts: failedAttempts + 1
        }
      })
    }

    this.incrementFailedAttempts(key)
  }

  /**
   * Track suspicious data access patterns
   */
  static trackDataAccess(request: NextRequest, context: {
    userId: string
    dataType: string
    recordCount: number
    sensitive: boolean
  }): void {
    if (context.sensitive || context.recordCount > 100) {
      this.createAlert(SecurityEventType.SENSITIVE_DATA_ACCESS, request, {
        severity: context.recordCount > 1000 ? 'high' : 'medium',
        title: 'Bulk Data Access Detected',
        description: `User accessed ${context.recordCount} ${context.dataType} records`,
        userId: context.userId,
        metadata: {
          dataType: context.dataType,
          recordCount: context.recordCount,
          sensitive: context.sensitive
        }
      })
    }
  }

  // Private helper methods
  private static extractIPAddress(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    return forwarded?.split(',')[0]?.trim() || realIP || request.ip || 'unknown'
  }

  private static async calculateSecurityMetrics(): Promise<SecurityMetrics> {
    // In a real implementation, this would query your logging database
    // For now, we'll return mock data based on current alerts
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => new Date(alert.timestamp) >= oneHourAgo)

    return {
      timeframe: 'last_hour',
      totalRequests: 1000, // Mock data
      securityEvents: recentAlerts.length,
      blockedRequests: recentAlerts.filter(a => a.severity === 'critical').length,
      failedLogins: recentAlerts.filter(a => a.eventType === SecurityEventType.LOGIN_FAILURE).length,
      rateLimitViolations: recentAlerts.filter(a => a.eventType === SecurityEventType.RATE_LIMIT_EXCEEDED).length,
      csrfViolations: recentAlerts.filter(a => a.eventType === SecurityEventType.CSRF_VIOLATION).length,
      suspiciousIPs: [...new Set(recentAlerts.map(a => a.ipAddress))],
      topUserAgents: [
        { userAgent: 'Mozilla/5.0...', count: 50 },
        { userAgent: 'Chrome/120.0...', count: 30 }
      ],
      errorRate: 0.02, // 2%
      averageResponseTime: 150 // ms
    }
  }

  private static getRecentSecurityEvents(limit: number): SecurityLogEntry[] {
    // In a real implementation, this would query your security log database
    // For now, we'll convert recent alerts to log entries
    return Array.from(this.alerts.values())
      .slice(0, limit)
      .map(alert => ({
        id: alert.id,
        timestamp: alert.timestamp,
        eventType: alert.eventType,
        severity: alert.severity,
        userId: alert.userId,
        sessionId: undefined,
        ipAddress: alert.ipAddress,
        userAgent: '',
        endpoint: '',
        method: '',
        description: alert.description,
        details: alert.metadata,
        blocked: alert.severity === 'critical'
      }))
  }

  private static async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    lastCheck: string
    issues: string[]
  }> {
    const criticalAlerts = this.getActiveAlerts().filter(a => a.severity === 'critical')
    const highAlerts = this.getActiveAlerts().filter(a => a.severity === 'high')
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    const issues: string[] = []

    if (criticalAlerts.length > 0) {
      status = 'critical'
      issues.push(`${criticalAlerts.length} critical security alert(s)`)
    } else if (highAlerts.length > 3) {
      status = 'warning' 
      issues.push(`${highAlerts.length} high severity alert(s)`)
    }

    return {
      status,
      uptime: process.uptime(),
      lastCheck: new Date().toISOString(),
      issues
    }
  }

  private static checkBruteForceAttempt(ipAddress: string, endpoint: string): void {
    // Implementation would track request frequency per IP
    // This is a simplified version
  }

  private static checkSuspiciousUserAgent(userAgent: string, request: NextRequest): void {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scan/i,
      /sqlmap/i,
      /nikto/i,
      /burp/i
    ]

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      this.createAlert(SecurityEventType.SUSPICIOUS_API_PATTERN, request, {
        severity: 'medium',
        title: 'Suspicious User Agent Detected',
        description: `Potentially malicious user agent: ${userAgent.substring(0, 100)}`,
        metadata: { userAgent }
      })
    }
  }

  private static checkUnusualResponseTime(responseTime: number, endpoint: string, request: NextRequest): void {
    // Alert on unusually slow responses that might indicate attacks
    if (responseTime > 5000) { // 5 seconds
      this.createAlert(SecurityEventType.SUSPICIOUS_API_PATTERN, request, {
        severity: 'low',
        title: 'Unusual Response Time',
        description: `Slow response time detected: ${responseTime}ms for ${endpoint}`,
        metadata: { responseTime, endpoint }
      })
    }
  }

  private static checkErrorPatterns(statusCode: number, ipAddress: string, request: NextRequest): void {
    if (statusCode >= 400) {
      // Track error patterns per IP
      const errorKey = `errors:${ipAddress}`
      const errorCount = this.getErrorCount(errorKey)
      
      if (errorCount > 20) { // 20 errors in tracking window
        this.createAlert(SecurityEventType.API_ABUSE, request, {
          severity: 'medium',
          title: 'High Error Rate Detected',
          description: `IP ${ipAddress} generating high error rate`,
          metadata: { ipAddress, errorCount: errorCount + 1 }
        })
      }
      
      this.incrementErrorCount(errorKey)
    }
  }

  private static sendCriticalAlert(alert: SecurityAlert): void {
    // In production, this would send immediate notifications
    console.error('🚨 CRITICAL SECURITY ALERT', {
      id: alert.id,
      title: alert.title,
      description: alert.description,
      ipAddress: alert.ipAddress,
      userId: alert.userId
    })

    // Send to notification services (Slack, email, PagerDuty, etc.)
    // this.sendSlackAlert(alert)
    // this.sendEmailAlert(alert)
    // this.triggerPagerDuty(alert)
  }

  // Simplified in-memory tracking (in production, use Redis)
  private static failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map()
  private static errorCounts: Map<string, { count: number; lastError: number }> = new Map()

  private static getFailedAttempts(key: string): number {
    const entry = this.failedAttempts.get(key)
    if (!entry) return 0
    
    // Reset if last attempt was more than 15 minutes ago
    if (Date.now() - entry.lastAttempt > 15 * 60 * 1000) {
      this.failedAttempts.delete(key)
      return 0
    }
    
    return entry.count
  }

  private static incrementFailedAttempts(key: string): void {
    const current = this.getFailedAttempts(key)
    this.failedAttempts.set(key, {
      count: current + 1,
      lastAttempt: Date.now()
    })
  }

  private static getErrorCount(key: string): number {
    const entry = this.errorCounts.get(key)
    if (!entry) return 0
    
    // Reset if last error was more than 5 minutes ago
    if (Date.now() - entry.lastError > 5 * 60 * 1000) {
      this.errorCounts.delete(key)
      return 0
    }
    
    return entry.count
  }

  private static incrementErrorCount(key: string): void {
    const current = this.getErrorCount(key)
    this.errorCounts.set(key, {
      count: current + 1,
      lastError: Date.now()
    })
  }

  /**
   * Clear old tracking data (cleanup method)
   */
  static cleanup(): void {
    const now = Date.now()
    const fifteenMinutesAgo = now - 15 * 60 * 1000
    const fiveMinutesAgo = now - 5 * 60 * 1000

    // Clean up old failed attempts
    for (const [key, entry] of this.failedAttempts.entries()) {
      if (entry.lastAttempt < fifteenMinutesAgo) {
        this.failedAttempts.delete(key)
      }
    }

    // Clean up old error counts
    for (const [key, entry] of this.errorCounts.entries()) {
      if (entry.lastError < fiveMinutesAgo) {
        this.errorCounts.delete(key)
      }
    }

    // Clean up old resolved alerts (keep for 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && new Date(alert.resolvedAt).getTime() < oneDayAgo) {
        this.alerts.delete(alertId)
      }
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(() => {
    SecurityMonitor.cleanup()
  }, 5 * 60 * 1000)
}

export default SecurityMonitor