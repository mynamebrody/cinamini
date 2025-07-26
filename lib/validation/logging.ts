import { NextRequest, NextResponse } from "next/server"
import { DataSanitizer } from "./sanitization"
import { SecurityEventInput } from "./schemas"

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Log categories
export enum LogCategory {
  REQUEST = 'request',
  RESPONSE = 'response',
  SECURITY = 'security',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system'
}

// Request log entry structure
export interface RequestLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  method: string
  url: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body?: any
  userId?: string
  sessionId?: string
  ipAddress: string
  userAgent: string
  referer?: string
  duration?: number
  statusCode?: number
  responseSize?: number
  metadata?: Record<string, any>
}

// Security log entry structure
export interface SecurityLogEntry {
  id: string
  timestamp: string
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  sessionId?: string
  ipAddress: string
  userAgent: string
  endpoint: string
  method: string
  description: string
  details: Record<string, any>
  blocked: boolean
}

// Performance metrics
export interface PerformanceMetrics {
  requestId: string
  endpoint: string
  method: string
  duration: number
  dbQueries?: number
  dbQueryTime?: number
  externalApiCalls?: number
  externalApiTime?: number
  memoryUsage?: number
  cpuUsage?: number
}

/**
 * Comprehensive logging system for security monitoring and audit trails
 */
export class SecurityLogger {
  private static readonly sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ]

  private static readonly sensitiveBodyFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'privateKey',
    'creditCard',
    'ssn',
    'bankAccount'
  ]

  /**
   * Log incoming request
   */
  static logRequest(request: NextRequest, context?: {
    userId?: string
    sessionId?: string
    startTime?: number
  }): string {
    const requestId = this.generateRequestId()
    const url = new URL(request.url)
    
    const logEntry: RequestLogEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      category: LogCategory.REQUEST,
      method: request.method,
      url: request.url,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: this.sanitizeHeaders(request.headers),
      userId: context?.userId,
      sessionId: context?.sessionId,
      ipAddress: this.extractIPAddress(request),
      userAgent: this.sanitizeUserAgent(request.headers.get('user-agent') || ''),
      referer: request.headers.get('referer') || undefined,
      metadata: {
        contentLength: request.headers.get('content-length'),
        acceptLanguage: request.headers.get('accept-language'),
        acceptEncoding: request.headers.get('accept-encoding')
      }
    }

    this.writeLogEntry(logEntry)
    return requestId
  }

  /**
   * Log request body (for POST/PUT/PATCH requests)
   */
  static async logRequestBody(request: NextRequest, requestId: string): Promise<void> {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.json()
        const sanitizedBody = this.sanitizeRequestBody(body)
        
        const bodyLogEntry: Partial<RequestLogEntry> = {
          id: `${requestId}_body`,
          timestamp: new Date().toISOString(),
          level: LogLevel.DEBUG,
          category: LogCategory.REQUEST,
          body: sanitizedBody,
          metadata: {
            parentRequestId: requestId,
            bodySize: JSON.stringify(body).length
          }
        }

        this.writeLogEntry(bodyLogEntry as RequestLogEntry)
      } catch (error) {
        this.logError('Failed to log request body', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  /**
   * Log response
   */
  static logResponse(
    requestId: string,
    response: NextResponse,
    context: {
      duration: number
      userId?: string
      sessionId?: string
    }
  ): void {
    const responseHeaders = this.extractResponseHeaders(response)
    
    const logEntry: Partial<RequestLogEntry> = {
      id: `${requestId}_response`,
      timestamp: new Date().toISOString(),
      level: this.getLogLevelForStatus(response.status),
      category: LogCategory.RESPONSE,
      statusCode: response.status,
      duration: context.duration,
      userId: context.userId,
      sessionId: context.sessionId,
      headers: responseHeaders,
      responseSize: parseInt(responseHeaders['content-length'] || '0', 10),
      metadata: {
        parentRequestId: requestId,
        cacheStatus: responseHeaders['cache-control'],
        contentType: responseHeaders['content-type']
      }
    }

    this.writeLogEntry(logEntry as RequestLogEntry)
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    eventType: string,
    request: NextRequest,
    context: {
      userId?: string
      sessionId?: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      details: Record<string, any>
      blocked?: boolean
    }
  ): void {
    const securityEntry: SecurityLogEntry = {
      id: this.generateSecurityEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity: context.severity,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: this.extractIPAddress(request),
      userAgent: this.sanitizeUserAgent(request.headers.get('user-agent') || ''),
      endpoint: new URL(request.url).pathname,
      method: request.method,
      description: context.description,
      details: this.sanitizeSecurityDetails(context.details),
      blocked: context.blocked || false
    }

    this.writeSecurityLogEntry(securityEntry)

    // Alert on critical security events
    if (context.severity === 'critical') {
      this.alertCriticalSecurityEvent(securityEntry)
    }
  }

  /**
   * Log authentication events
   */
  static logAuthEvent(
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'token_refresh',
    request: NextRequest,
    context: {
      userId?: string
      sessionId?: string
      success: boolean
      reason?: string
      details?: Record<string, any>
    }
  ): void {
    this.logSecurityEvent(eventType, request, {
      severity: context.success ? 'low' : 'medium',
      description: `Authentication event: ${eventType}`,
      details: {
        success: context.success,
        reason: context.reason,
        ...context.details
      },
      userId: context.userId,
      sessionId: context.sessionId,
      blocked: !context.success
    })
  }

  /**
   * Log validation failures
   */
  static logValidationFailure(
    request: NextRequest,
    context: {
      userId?: string
      sessionId?: string
      field: string
      value: any
      reason: string
      schema?: string
    }
  ): void {
    this.logSecurityEvent('validation_failure', request, {
      severity: 'low',
      description: `Validation failed for field: ${context.field}`,
      details: {
        field: context.field,
        value: this.sanitizeValue(context.value),
        reason: context.reason,
        schema: context.schema
      },
      userId: context.userId,
      sessionId: context.sessionId
    })
  }

  /**
   * Log database operations
   */
  static logDatabaseOperation(
    operation: 'select' | 'insert' | 'update' | 'delete',
    table: string,
    context: {
      userId?: string
      sessionId?: string
      requestId?: string
      duration: number
      rowCount?: number
      success: boolean
      error?: string
    }
  ): void {
    const logEntry: Partial<RequestLogEntry> = {
      id: this.generateOperationId(),
      timestamp: new Date().toISOString(),
      level: context.success ? LogLevel.DEBUG : LogLevel.ERROR,
      category: LogCategory.DATABASE,
      userId: context.userId,
      sessionId: context.sessionId,
      duration: context.duration,
      metadata: {
        operation,
        table,
        rowCount: context.rowCount,
        success: context.success,
        error: context.error,
        parentRequestId: context.requestId
      }
    }

    this.writeLogEntry(logEntry as RequestLogEntry)
  }

  /**
   * Log external API calls
   */
  static logExternalApiCall(
    apiName: string,
    endpoint: string,
    method: string,
    context: {
      userId?: string
      sessionId?: string
      requestId?: string
      duration: number
      statusCode?: number
      success: boolean
      error?: string
      rateLimit?: {
        remaining: number
        reset: number
      }
    }
  ): void {
    const logEntry: Partial<RequestLogEntry> = {
      id: this.generateOperationId(),
      timestamp: new Date().toISOString(),
      level: context.success ? LogLevel.DEBUG : LogLevel.WARN,
      category: LogCategory.EXTERNAL_API,
      userId: context.userId,
      sessionId: context.sessionId,
      duration: context.duration,
      statusCode: context.statusCode,
      metadata: {
        apiName,
        endpoint,
        method,
        success: context.success,
        error: context.error,
        rateLimit: context.rateLimit,
        parentRequestId: context.requestId
      }
    }

    this.writeLogEntry(logEntry as RequestLogEntry)
  }

  /**
   * Log performance metrics
   */
  static logPerformanceMetrics(metrics: PerformanceMetrics): void {
    const logEntry: Partial<RequestLogEntry> = {
      id: `${metrics.requestId}_perf`,
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      category: LogCategory.SYSTEM,
      duration: metrics.duration,
      metadata: {
        type: 'performance_metrics',
        endpoint: metrics.endpoint,
        method: metrics.method,
        dbQueries: metrics.dbQueries,
        dbQueryTime: metrics.dbQueryTime,
        externalApiCalls: metrics.externalApiCalls,
        externalApiTime: metrics.externalApiTime,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        parentRequestId: metrics.requestId
      }
    }

    this.writeLogEntry(logEntry as RequestLogEntry)
  }

  /**
   * Log general errors
   */
  static logError(
    message: string,
    context: {
      userId?: string
      sessionId?: string
      requestId?: string
      error?: string
      stack?: string
      metadata?: Record<string, any>
    }
  ): void {
    const logEntry: Partial<RequestLogEntry> = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: {
        message,
        error: context.error,
        stack: process.env.NODE_ENV === 'development' ? context.stack : undefined,
        parentRequestId: context.requestId,
        ...context.metadata
      }
    }

    this.writeLogEntry(logEntry as RequestLogEntry)
  }

  // Private helper methods
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static generateSecurityEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static extractIPAddress(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    return forwarded?.split(',')[0]?.trim() || realIP || request.ip || 'unknown'
  }

  private static sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {}
    
    headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      
      if (this.sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = DataSanitizer.maskSensitiveData(value, 4)
      } else {
        sanitized[key] = DataSanitizer.sanitizeText(value)
      }
    })

    return sanitized
  }

  private static extractResponseHeaders(response: NextResponse): Record<string, string> {
    const headers: Record<string, string> = {}
    
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return headers
  }

  private static sanitizeUserAgent(userAgent: string): string {
    // Remove potential XSS or injection attempts from user agent
    return DataSanitizer.sanitizeText(userAgent).substring(0, 500)
  }

  private static sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body
    }

    const sanitized = { ...body }
    
    this.sensitiveBodyFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = DataSanitizer.maskSensitiveData(String(sanitized[field]), 2)
      }
    })

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key])
      }
    })

    return sanitized
  }

  private static sanitizeSecurityDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    Object.entries(details).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sanitized[key] = DataSanitizer.sanitizeText(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeSecurityDetails(value)
      } else {
        sanitized[key] = value
      }
    })

    return sanitized
  }

  private static sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return DataSanitizer.sanitizeText(value).substring(0, 100)
    }
    if (typeof value === 'object' && value !== null) {
      return DataSanitizer.sanitizeObject(value)
    }
    return value
  }

  private static getLogLevelForStatus(statusCode: number): LogLevel {
    if (statusCode >= 500) return LogLevel.ERROR
    if (statusCode >= 400) return LogLevel.WARN
    if (statusCode >= 300) return LogLevel.INFO
    return LogLevel.DEBUG
  }

  private static writeLogEntry(entry: RequestLogEntry): void {
    // In production, this would write to your logging service
    // For now, we'll use structured console logging
    const logMethod = this.getConsoleMethod(entry.level)
    logMethod(`[${entry.category.toUpperCase()}] ${entry.timestamp}`, entry)
  }

  private static writeSecurityLogEntry(entry: SecurityLogEntry): void {
    // Security logs should go to a special security monitoring system
    console.warn(`[SECURITY] ${entry.timestamp}`, entry)
    
    // In production, also send to SIEM or security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to security monitoring service
      this.sendToSecurityService(entry)
    }
  }

  private static getConsoleMethod(level: LogLevel): Function {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug
      case LogLevel.INFO:
        return console.info
      case LogLevel.WARN:
        return console.warn
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error
      default:
        return console.log
    }
  }

  private static alertCriticalSecurityEvent(entry: SecurityLogEntry): void {
    // In production, this would trigger immediate alerts
    console.error(`🚨 CRITICAL SECURITY EVENT: ${entry.eventType}`, {
      id: entry.id,
      timestamp: entry.timestamp,
      ipAddress: entry.ipAddress,
      userId: entry.userId,
      description: entry.description
    })

    // Send immediate alert to security team
    // this.sendCriticalAlert(entry)
  }

  private static sendToSecurityService(entry: SecurityLogEntry): void {
    // Placeholder for sending security events to external monitoring service
    // This would typically be a webhook or API call to your SIEM
    if (process.env.SECURITY_WEBHOOK_URL) {
      // Example: POST to security monitoring service
      // fetch(process.env.SECURITY_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // })
    }
  }
}

/**
 * Request logging middleware
 */
export function withRequestLogging(
  handler: Function,
  options: {
    logBody?: boolean
    logResponse?: boolean
    logPerformance?: boolean
  } = {}
) {
  return async (...args: any[]): Promise<NextResponse> => {
    const [request] = args
    const startTime = Date.now()
    
    // Log incoming request
    const requestId = SecurityLogger.logRequest(request, { startTime })
    
    // Log request body if enabled
    if (options.logBody) {
      await SecurityLogger.logRequestBody(request, requestId)
    }

    try {
      // Execute handler
      const response = await handler(...args)
      const duration = Date.now() - startTime
      
      // Log response if enabled
      if (options.logResponse) {
        SecurityLogger.logResponse(requestId, response, { duration })
      }

      // Log performance metrics if enabled
      if (options.logPerformance) {
        const url = new URL(request.url)
        SecurityLogger.logPerformanceMetrics({
          requestId,
          endpoint: url.pathname,
          method: request.method,
          duration
        })
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      SecurityLogger.logError('Request handler error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      throw error
    }
  }
}

export default SecurityLogger