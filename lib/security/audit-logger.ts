import { NextRequest } from "next/server"
import { SecurityLogger } from "../validation/logging"

/**
 * Audit event types for comprehensive tracking
 */
export enum AuditEventType {
  // User Management Events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  USER_REACTIVATED = 'user_reactivated',
  
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  
  // Authorization Events
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  ACCESS_DENIED = 'access_denied',
  
  // Data Events
  DATA_CREATED = 'data_created',
  DATA_READ = 'data_read',
  DATA_UPDATED = 'data_updated',
  DATA_DELETED = 'data_deleted',
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',
  
  // Game Events
  GAME_PLAYED = 'game_played',
  SCORE_UPDATED = 'score_updated',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  
  // System Events
  CONFIGURATION_CHANGED = 'configuration_changed',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  
  // Security Events
  SECURITY_POLICY_UPDATED = 'security_policy_updated',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  VULNERABILITY_DETECTED = 'vulnerability_detected',
  INCIDENT_CREATED = 'incident_created',
  INCIDENT_RESOLVED = 'incident_resolved',
  
  // API Events
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  API_RATE_LIMIT_EXCEEDED = 'api_rate_limit_exceeded',
  API_ENDPOINT_ACCESSED = 'api_endpoint_accessed'
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  eventType: AuditEventType
  category: 'user' | 'auth' | 'data' | 'system' | 'security' | 'api' | 'game'
  severity: 'low' | 'medium' | 'high' | 'critical'
  
  // Actor information (who performed the action)
  actorUserId?: string
  actorSessionId?: string
  actorIpAddress: string
  actorUserAgent: string
  
  // Target information (what was affected)
  targetUserId?: string
  targetResourceType?: string
  targetResourceId?: string
  
  // Action details
  action: string
  description: string
  outcome: 'success' | 'failure' | 'partial'
  
  // Request context
  requestId?: string
  endpoint?: string
  method?: string
  
  // Data changes (before/after for updates)
  dataChanges?: {
    before?: Record<string, any>
    after?: Record<string, any>
    fields?: string[]
  }
  
  // Additional metadata
  metadata?: Record<string, any>
  
  // Compliance and retention
  retentionPeriod?: number // days
  complianceFlags?: string[]
}

/**
 * Audit trail query parameters
 */
export interface AuditTrailQuery {
  userId?: string
  eventType?: AuditEventType
  category?: string
  startDate?: Date
  endDate?: Date
  severity?: string
  outcome?: string
  limit?: number
  offset?: number
}

/**
 * Comprehensive audit logging system
 */
export class AuditLogger {
  private static logs: Map<string, AuditLogEntry> = new Map()
  private static readonly MAX_IN_MEMORY_LOGS = 10000

  /**
   * Log an audit event
   */
  static async logEvent(
    eventType: AuditEventType,
    request: NextRequest,
    context: {
      actorUserId?: string
      actorSessionId?: string
      targetUserId?: string
      targetResourceType?: string
      targetResourceId?: string
      action: string
      description: string
      outcome: 'success' | 'failure' | 'partial'
      dataChanges?: AuditLogEntry['dataChanges']
      metadata?: Record<string, any>
      severity?: 'low' | 'medium' | 'high' | 'critical'
      requestId?: string
    }
  ): Promise<AuditLogEntry> {
    const logEntry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      eventType,
      category: this.getCategoryForEventType(eventType),
      severity: context.severity || this.getDefaultSeverity(eventType),
      
      // Actor information
      actorUserId: context.actorUserId,
      actorSessionId: context.actorSessionId,
      actorIpAddress: this.extractIPAddress(request),
      actorUserAgent: request.headers.get('user-agent') || 'unknown',
      
      // Target information
      targetUserId: context.targetUserId,
      targetResourceType: context.targetResourceType,
      targetResourceId: context.targetResourceId,
      
      // Action details
      action: context.action,
      description: context.description,
      outcome: context.outcome,
      
      // Request context
      requestId: context.requestId,
      endpoint: new URL(request.url).pathname,
      method: request.method,
      
      // Data changes
      dataChanges: context.dataChanges,
      
      // Metadata
      metadata: {
        ...context.metadata,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        contentType: request.headers.get('content-type')
      },
      
      // Compliance
      retentionPeriod: this.getRetentionPeriod(eventType),
      complianceFlags: this.getComplianceFlags(eventType)
    }

    // Store the log entry
    await this.storeLogEntry(logEntry)

    // Also log to security logger for monitoring
    SecurityLogger.logSecurityEvent(eventType, request, {
      severity: logEntry.severity,
      description: logEntry.description,
      details: {
        action: logEntry.action,
        outcome: logEntry.outcome,
        targetResourceType: logEntry.targetResourceType,
        targetResourceId: logEntry.targetResourceId
      },
      userId: context.actorUserId,
      sessionId: context.actorSessionId
    })

    return logEntry
  }

  /**
   * Log user authentication events
   */
  static async logAuthEvent(
    eventType: AuditEventType,
    request: NextRequest,
    context: {
      userId?: string
      sessionId?: string
      outcome: 'success' | 'failure'
      reason?: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.logEvent(eventType, request, {
      actorUserId: context.userId,
      actorSessionId: context.sessionId,
      action: eventType.replace('_', ' '),
      description: `User ${eventType.replace('_', ' ')} ${context.outcome}`,
      outcome: context.outcome,
      severity: context.outcome === 'failure' ? 'medium' : 'low',
      metadata: {
        reason: context.reason,
        ...context.metadata
      }
    })
  }

  /**
   * Log data access and modification events
   */
  static async logDataEvent(
    eventType: AuditEventType,
    request: NextRequest,
    context: {
      actorUserId: string
      sessionId?: string
      resourceType: string
      resourceId: string
      dataChanges?: AuditLogEntry['dataChanges']
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.logEvent(eventType, request, {
      actorUserId: context.actorUserId,
      actorSessionId: context.sessionId,
      targetResourceType: context.resourceType,
      targetResourceId: context.resourceId,
      action: this.getActionForDataEvent(eventType),
      description: `${context.resourceType} ${this.getActionForDataEvent(eventType)} by user ${context.actorUserId}`,
      outcome: 'success',
      dataChanges: context.dataChanges,
      metadata: context.metadata,
      severity: this.getSeverityForDataEvent(eventType, context.resourceType)
    })
  }

  /**
   * Log game-related events
   */
  static async logGameEvent(
    eventType: AuditEventType,
    request: NextRequest,
    context: {
      userId: string
      gameType: string
      score?: number
      gameData?: Record<string, any>
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.logEvent(eventType, request, {
      actorUserId: context.userId,
      targetResourceType: 'game',
      targetResourceId: context.gameType,
      action: eventType.replace('_', ' '),
      description: `User played ${context.gameType}`,
      outcome: 'success',
      severity: 'low',
      metadata: {
        gameType: context.gameType,
        score: context.score,
        gameData: context.gameData,
        ...context.metadata
      }
    })
  }

  /**
   * Log system administration events
   */
  static async logAdminEvent(
    eventType: AuditEventType,
    request: NextRequest,
    context: {
      adminUserId: string
      targetUserId?: string
      action: string
      description: string
      outcome: 'success' | 'failure' | 'partial'
      dataChanges?: AuditLogEntry['dataChanges']
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.logEvent(eventType, request, {
      actorUserId: context.adminUserId,
      targetUserId: context.targetUserId,
      action: context.action,
      description: context.description,
      outcome: context.outcome,
      severity: 'high', // Admin actions are always high severity
      dataChanges: context.dataChanges,
      metadata: context.metadata
    })
  }

  /**
   * Query audit trail
   */
  static async queryAuditTrail(query: AuditTrailQuery): Promise<{
    logs: AuditLogEntry[]
    total: number
    hasMore: boolean
  }> {
    let filteredLogs = Array.from(this.logs.values())

    // Apply filters
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.actorUserId === query.userId || log.targetUserId === query.userId
      )
    }

    if (query.eventType) {
      filteredLogs = filteredLogs.filter(log => log.eventType === query.eventType)
    }

    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.category === query.category)
    }

    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity)
    }

    if (query.outcome) {
      filteredLogs = filteredLogs.filter(log => log.outcome === query.outcome)
    }

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= query.startDate!
      )
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= query.endDate!
      )
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const total = filteredLogs.length
    const limit = query.limit || 50
    const offset = query.offset || 0

    const paginatedLogs = filteredLogs.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return {
      logs: paginatedLogs,
      total,
      hasMore
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsByCategory: Record<string, number>
    eventsBySeverity: Record<string, number>
    eventsByOutcome: Record<string, number>
    topUsers: Array<{ userId: string; eventCount: number }>
    timeline: Array<{ timestamp: string; count: number }>
  }> {
    const now = new Date()
    let startTime: Date

    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    const recentLogs = Array.from(this.logs.values())
      .filter(log => new Date(log.timestamp) >= startTime)

    const eventsByType: Record<string, number> = {}
    const eventsByCategory: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const eventsByOutcome: Record<string, number> = {}
    const userEventCounts: Record<string, number> = {}

    recentLogs.forEach(log => {
      // Count by type
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1
      
      // Count by category
      eventsByCategory[log.category] = (eventsByCategory[log.category] || 0) + 1
      
      // Count by severity
      eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1
      
      // Count by outcome
      eventsByOutcome[log.outcome] = (eventsByOutcome[log.outcome] || 0) + 1
      
      // Count by user
      if (log.actorUserId) {
        userEventCounts[log.actorUserId] = (userEventCounts[log.actorUserId] || 0) + 1
      }
    })

    const topUsers = Object.entries(userEventCounts)
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)

    // Generate timeline data
    const timeline = this.generateTimeline(recentLogs, timeframe)

    return {
      totalEvents: recentLogs.length,
      eventsByType,
      eventsByCategory,
      eventsBySeverity,
      eventsByOutcome,
      topUsers,
      timeline
    }
  }

  /**
   * Export audit logs for compliance
   */
  static async exportAuditLogs(
    query: AuditTrailQuery,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<string> {
    const { logs } = await this.queryAuditTrail(query)

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2)
      
      case 'csv':
        return this.convertToCSV(logs)
      
      case 'xml':
        return this.convertToXML(logs)
      
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // Private helper methods
  private static generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static extractIPAddress(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    return forwarded?.split(',')[0]?.trim() || realIP || request.ip || 'unknown'
  }

  private static getCategoryForEventType(eventType: AuditEventType): AuditLogEntry['category'] {
    if (eventType.includes('USER_')) return 'user'
    if (eventType.includes('LOGIN_') || eventType.includes('PASSWORD_') || eventType.includes('TWO_FACTOR_')) return 'auth'
    if (eventType.includes('DATA_')) return 'data'
    if (eventType.includes('GAME_') || eventType.includes('SCORE_') || eventType.includes('ACHIEVEMENT_')) return 'game'
    if (eventType.includes('API_')) return 'api'
    if (eventType.includes('SECURITY_') || eventType.includes('SUSPICIOUS_') || eventType.includes('INCIDENT_')) return 'security'
    return 'system'
  }

  private static getDefaultSeverity(eventType: AuditEventType): 'low' | 'medium' | 'high' | 'critical' {
    const highSeverityEvents = [
      AuditEventType.USER_DELETED,
      AuditEventType.PERMISSION_GRANTED,
      AuditEventType.ROLE_ASSIGNED,
      AuditEventType.CONFIGURATION_CHANGED,
      AuditEventType.SECURITY_POLICY_UPDATED
    ]

    const mediumSeverityEvents = [
      AuditEventType.LOGIN_FAILURE,
      AuditEventType.ACCESS_DENIED,
      AuditEventType.DATA_EXPORTED,
      AuditEventType.SUSPICIOUS_ACTIVITY
    ]

    if (highSeverityEvents.includes(eventType)) return 'high'
    if (mediumSeverityEvents.includes(eventType)) return 'medium'
    return 'low'
  }

  private static getActionForDataEvent(eventType: AuditEventType): string {
    switch (eventType) {
      case AuditEventType.DATA_CREATED: return 'created'
      case AuditEventType.DATA_READ: return 'read'
      case AuditEventType.DATA_UPDATED: return 'updated'
      case AuditEventType.DATA_DELETED: return 'deleted'
      case AuditEventType.DATA_EXPORTED: return 'exported'
      case AuditEventType.DATA_IMPORTED: return 'imported'
      default: return 'accessed'
    }
  }

  private static getSeverityForDataEvent(eventType: AuditEventType, resourceType: string): 'low' | 'medium' | 'high' | 'critical' {
    // Sensitive data types
    const sensitiveResources = ['user_profile', 'payment_info', 'personal_data']
    
    if (sensitiveResources.includes(resourceType)) {
      if (eventType === AuditEventType.DATA_DELETED || eventType === AuditEventType.DATA_EXPORTED) {
        return 'high'
      }
      return 'medium'
    }

    if (eventType === AuditEventType.DATA_DELETED) return 'medium'
    return 'low'
  }

  private static getRetentionPeriod(eventType: AuditEventType): number {
    // Security and compliance events have longer retention
    const longRetentionEvents = [
      AuditEventType.USER_DELETED,
      AuditEventType.DATA_EXPORTED,
      AuditEventType.SECURITY_POLICY_UPDATED,
      AuditEventType.INCIDENT_CREATED
    ]

    if (longRetentionEvents.includes(eventType)) return 2555 // 7 years
    if (eventType.includes('LOGIN_') || eventType.includes('PASSWORD_')) return 365 // 1 year
    return 90 // 90 days default
  }

  private static getComplianceFlags(eventType: AuditEventType): string[] {
    const flags: string[] = []

    // GDPR compliance flags
    if (eventType.includes('DATA_') || eventType.includes('USER_')) {
      flags.push('GDPR')
    }

    // SOX compliance for financial data
    if (eventType.includes('PAYMENT_') || eventType.includes('FINANCIAL_')) {
      flags.push('SOX')
    }

    // HIPAA for health data (if applicable)
    if (eventType.includes('HEALTH_') || eventType.includes('MEDICAL_')) {
      flags.push('HIPAA')
    }

    return flags
  }

  private static async storeLogEntry(entry: AuditLogEntry): Promise<void> {
    // Store in memory (in production, this would go to a database)
    this.logs.set(entry.id, entry)

    // Keep memory usage under control
    if (this.logs.size > this.MAX_IN_MEMORY_LOGS) {
      const oldestEntries = Array.from(this.logs.entries())
        .sort(([,a], [,b]) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(0, 1000)

      oldestEntries.forEach(([id]) => this.logs.delete(id))
    }

    // In production, you would also:
    // 1. Store to database
    // 2. Send to log aggregation service
    // 3. Archive old entries
    // 4. Implement log rotation
  }

  private static generateTimeline(logs: AuditLogEntry[], timeframe: string): Array<{ timestamp: string; count: number }> {
    const buckets: Record<string, number> = {}
    
    logs.forEach(log => {
      const date = new Date(log.timestamp)
      let bucketKey: string

      switch (timeframe) {
        case 'hour':
          bucketKey = `${date.getHours()}:${Math.floor(date.getMinutes() / 10) * 10}`
          break
        case 'day':
          bucketKey = `${date.getHours()}:00`
          break
        case 'week':
          bucketKey = date.toISOString().split('T')[0]
          break
        case 'month':
          bucketKey = date.toISOString().split('T')[0]
          break
        default:
          bucketKey = date.toISOString().split('T')[0]
      }

      buckets[bucketKey] = (buckets[bucketKey] || 0) + 1
    })

    return Object.entries(buckets)
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  private static convertToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return ''
    
    const headers = [
      'id', 'timestamp', 'eventType', 'category', 'severity', 'actorUserId', 
      'actorIpAddress', 'targetResourceType', 'targetResourceId', 'action', 
      'description', 'outcome', 'endpoint', 'method'
    ]

    const csvLines = [headers.join(',')]
    
    logs.forEach(log => {
      const row = headers.map(header => {
        const value = (log as any)[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value || ''
      })
      csvLines.push(row.join(','))
    })

    return csvLines.join('\n')
  }

  private static convertToXML(logs: AuditLogEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditLogs>\n'
    
    logs.forEach(log => {
      xml += '  <auditLog>\n'
      Object.entries(log).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const xmlValue = typeof value === 'object' 
            ? `<![CDATA[${JSON.stringify(value)}]]>`
            : String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          xml += `    <${key}>${xmlValue}</${key}>\n`
        }
      })
      xml += '  </auditLog>\n'
    })
    
    xml += '</auditLogs>'
    return xml
  }
}

export default AuditLogger