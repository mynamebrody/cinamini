import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateUUID } from "./schemas"
import { DataSanitizer } from "./sanitization"
import { SecurityLogger } from "./logging"

// Resource ownership types
export interface ResourceOwnership {
  resourceId: string
  resourceType: string
  ownerId: string
  permissions: ResourcePermission[]
  metadata?: Record<string, any>
}

export interface ResourcePermission {
  action: 'read' | 'write' | 'delete' | 'admin'
  granted: boolean
  conditions?: Record<string, any>
}

// IDOR protection result
export interface IDORProtectionResult {
  allowed: boolean
  reason?: string
  resourceId?: string
  userId?: string
  permissions?: ResourcePermission[]
}

// Access patterns for different resource types
export interface AccessPattern {
  resourceType: string
  ownershipField: string
  publicReadable?: boolean
  sharedAccessField?: string
  adminOverride?: boolean
}

/**
 * IDOR (Insecure Direct Object Reference) Protection System
 */
export class IDORProtection {
  private static readonly accessPatterns: Record<string, AccessPattern> = {
    // User-owned resources
    'retitled_guesses': {
      resourceType: 'retitled_guesses',
      ownershipField: 'user_id',
      publicReadable: false,
      adminOverride: true
    },
    'retitled_user_stats': {
      resourceType: 'retitled_user_stats',
      ownershipField: 'user_id',
      publicReadable: false,
      adminOverride: true
    },
    'budget_bracket_guesses': {
      resourceType: 'budget_bracket_guesses',
      ownershipField: 'user_id',
      publicReadable: false,
      adminOverride: true
    },
    'budget_bracket_user_stats': {
      resourceType: 'budget_bracket_user_stats',
      ownershipField: 'user_id',
      publicReadable: false,
      adminOverride: true
    },
    'cinamini_user_profiles': {
      resourceType: 'cinamini_user_profiles',
      ownershipField: 'user_id',
      publicReadable: true, // Public profiles can be read
      adminOverride: true
    },
    'user_favorites': {
      resourceType: 'user_favorites',
      ownershipField: 'user_id',
      publicReadable: false,
      adminOverride: true
    },
    
    // Public resources with read-only access
    'retitled_puzzles': {
      resourceType: 'retitled_puzzles',
      ownershipField: 'created_by',
      publicReadable: true,
      adminOverride: true
    },
    'budget_bracket_puzzles': {
      resourceType: 'budget_bracket_puzzles',
      ownershipField: 'created_by',
      publicReadable: true,
      adminOverride: true
    },
    'games': {
      resourceType: 'games',
      ownershipField: 'created_by',
      publicReadable: true,
      adminOverride: true
    }
  }

  /**
   * Check if user can access a specific resource
   */
  static async checkResourceAccess(
    userId: string | undefined,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete' | 'admin',
    request?: NextRequest
  ): Promise<IDORProtectionResult> {
    try {
      // Sanitize inputs
      const sanitizedResourceType = DataSanitizer.sanitizeText(resourceType)
      const sanitizedResourceId = DataSanitizer.sanitizeUuid(resourceId)
      
      if (!sanitizedResourceId) {
        this.logIDORAttempt(request, userId, resourceType, resourceId, 'Invalid resource ID format')
        return { 
          allowed: false, 
          reason: 'Invalid resource identifier' 
        }
      }

      // Get access pattern for resource type
      const pattern = this.accessPatterns[sanitizedResourceType]
      if (!pattern) {
        this.logIDORAttempt(request, userId, resourceType, resourceId, 'Unknown resource type')
        return { 
          allowed: false, 
          reason: 'Resource type not supported' 
        }
      }

      // Check if user is authenticated for protected resources
      if (!userId && !pattern.publicReadable) {
        return { 
          allowed: false, 
          reason: 'Authentication required' 
        }
      }

      // For public readable resources, allow read access
      if (pattern.publicReadable && action === 'read') {
        return { 
          allowed: true, 
          resourceId: sanitizedResourceId,
          userId,
          permissions: [{ action: 'read', granted: true }]
        }
      }

      // Check resource ownership
      const ownership = await this.getResourceOwnership(
        sanitizedResourceType,
        sanitizedResourceId,
        pattern
      )

      if (!ownership) {
        this.logIDORAttempt(request, userId, resourceType, resourceId, 'Resource not found')
        return { 
          allowed: false, 
          reason: 'Resource not found' 
        }
      }

      // Check if user owns the resource or has admin privileges
      const hasOwnership = userId === ownership.ownerId
      const hasAdminAccess = pattern.adminOverride && await this.isUserAdmin(userId)

      if (!hasOwnership && !hasAdminAccess) {
        this.logIDORAttempt(request, userId, resourceType, resourceId, 'Access denied - not owner')
        return { 
          allowed: false, 
          reason: 'Access denied',
          resourceId: sanitizedResourceId,
          userId
        }
      }

      // Check specific action permissions
      const permissions = this.getActionPermissions(ownership, action, hasAdminAccess)
      const actionAllowed = permissions.some(p => p.action === action && p.granted)

      if (!actionAllowed) {
        this.logIDORAttempt(request, userId, resourceType, resourceId, `Action '${action}' not permitted`)
        return { 
          allowed: false, 
          reason: `Action '${action}' not permitted`,
          resourceId: sanitizedResourceId,
          userId,
          permissions
        }
      }

      return { 
        allowed: true, 
        resourceId: sanitizedResourceId,
        userId,
        permissions
      }

    } catch (error) {
      console.error('IDOR protection error:', error)
      this.logIDORAttempt(request, userId, resourceType, resourceId, 'System error during access check')
      
      return { 
        allowed: false, 
        reason: 'Access check failed' 
      }
    }
  }

  /**
   * Check bulk resource access (for lists/collections)
   */
  static async checkBulkResourceAccess(
    userId: string | undefined,
    resourceType: string,
    resourceIds: string[],
    action: 'read' | 'write' | 'delete' | 'admin',
    request?: NextRequest
  ): Promise<{
    allowed: string[]
    denied: string[]
    permissions: Record<string, ResourcePermission[]>
  }> {
    const allowed: string[] = []
    const denied: string[] = []
    const permissions: Record<string, ResourcePermission[]> = {}

    // Limit bulk operations to prevent abuse
    const maxBulkSize = 100
    const limitedIds = resourceIds.slice(0, maxBulkSize)

    if (resourceIds.length > maxBulkSize) {
      this.logIDORAttempt(
        request, 
        userId, 
        resourceType, 
        `bulk-${resourceIds.length}`, 
        'Bulk operation size exceeded limit'
      )
    }

    // Check each resource individually
    for (const resourceId of limitedIds) {
      const result = await this.checkResourceAccess(
        userId, 
        resourceType, 
        resourceId, 
        action, 
        request
      )

      if (result.allowed) {
        allowed.push(resourceId)
        if (result.permissions) {
          permissions[resourceId] = result.permissions
        }
      } else {
        denied.push(resourceId)
      }
    }

    return { allowed, denied, permissions }
  }

  /**
   * Filter query results based on user permissions
   */
  static async filterQueryResults<T extends { id: string }>(
    userId: string | undefined,
    resourceType: string,
    results: T[],
    action: 'read' | 'write' | 'delete' | 'admin' = 'read'
  ): Promise<T[]> {
    if (results.length === 0) {
      return results
    }

    const resourceIds = results.map(r => r.id)
    const accessCheck = await this.checkBulkResourceAccess(
      userId,
      resourceType,
      resourceIds,
      action
    )

    return results.filter(result => accessCheck.allowed.includes(result.id))
  }

  /**
   * Create secure query filters for resource access
   */
  static createOwnershipFilter(
    userId: string | undefined,
    resourceType: string
  ): Record<string, any> | null {
    const pattern = this.accessPatterns[resourceType]
    if (!pattern) {
      return null
    }

    // For public readable resources, no filter needed for read operations
    if (pattern.publicReadable) {
      return {}
    }

    // Require user ownership
    if (!userId) {
      return null
    }

    return { [pattern.ownershipField]: userId }
  }

  /**
   * Validate resource ownership on creation
   */
  static validateResourceCreation(
    userId: string | undefined,
    resourceType: string,
    resourceData: Record<string, any>
  ): { valid: boolean; reason?: string; sanitizedData?: Record<string, any> } {
    const pattern = this.accessPatterns[resourceType]
    if (!pattern) {
      return { valid: false, reason: 'Unknown resource type' }
    }

    if (!userId) {
      return { valid: false, reason: 'Authentication required' }
    }

    // Ensure the ownership field is set correctly
    const sanitizedData = { ...resourceData }
    sanitizedData[pattern.ownershipField] = userId

    // Remove any admin-only fields
    const adminOnlyFields = ['created_by', 'admin_notes', 'internal_flags']
    adminOnlyFields.forEach(field => {
      if (field in sanitizedData) {
        delete sanitizedData[field]
      }
    })

    return { valid: true, sanitizedData }
  }

  /**
   * Check if user can perform cross-resource operations
   */
  static async checkCrossResourceAccess(
    userId: string | undefined,
    sourceResourceType: string,
    sourceResourceId: string,
    targetResourceType: string,
    targetResourceId: string,
    operation: string,
    request?: NextRequest
  ): Promise<IDORProtectionResult> {
    // Check access to both resources
    const sourceAccess = await this.checkResourceAccess(
      userId,
      sourceResourceType,
      sourceResourceId,
      'read',
      request
    )

    const targetAccess = await this.checkResourceAccess(
      userId,
      targetResourceType,
      targetResourceId,
      'write',
      request
    )

    if (!sourceAccess.allowed || !targetAccess.allowed) {
      this.logIDORAttempt(
        request,
        userId,
        `cross-resource:${sourceResourceType}->${targetResourceType}`,
        `${sourceResourceId}->${targetResourceId}`,
        'Cross-resource access denied'
      )

      return {
        allowed: false,
        reason: 'Cross-resource access denied'
      }
    }

    return {
      allowed: true,
      resourceId: `${sourceResourceId}->${targetResourceId}`,
      userId
    }
  }

  // Private helper methods
  private static async getResourceOwnership(
    resourceType: string,
    resourceId: string,
    pattern: AccessPattern
  ): Promise<ResourceOwnership | null> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from(resourceType)
        .select(`id, ${pattern.ownershipField}`)
        .eq('id', resourceId)
        .single()

      if (error || !data) {
        return null
      }

      return {
        resourceId,
        resourceType,
        ownerId: data[pattern.ownershipField],
        permissions: [] // Will be filled by getActionPermissions
      }
    } catch (error) {
      console.error('Error getting resource ownership:', error)
      return null
    }
  }

  private static async isUserAdmin(userId: string | undefined): Promise<boolean> {
    if (!userId) {
      return false
    }

    try {
      const supabase = await createClient()
      
      // Check if user has admin role in user metadata or profiles
      const { data: user } = await supabase.auth.admin.getUserById(userId)
      
      return user?.user?.user_metadata?.role === 'admin' ||
             user?.user?.app_metadata?.role === 'admin'
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  private static getActionPermissions(
    ownership: ResourceOwnership,
    action: 'read' | 'write' | 'delete' | 'admin',
    hasAdminAccess: boolean
  ): ResourcePermission[] {
    const permissions: ResourcePermission[] = []

    // Admin users get all permissions
    if (hasAdminAccess) {
      return [
        { action: 'read', granted: true },
        { action: 'write', granted: true },
        { action: 'delete', granted: true },
        { action: 'admin', granted: true }
      ]
    }

    // Resource owner permissions
    switch (action) {
      case 'read':
        permissions.push({ action: 'read', granted: true })
        break
      case 'write':
        permissions.push({ action: 'write', granted: true })
        break
      case 'delete':
        // Some resources might not allow deletion
        const pattern = this.accessPatterns[ownership.resourceType]
        const allowDelete = !['games', 'retitled_puzzles', 'budget_bracket_puzzles'].includes(
          ownership.resourceType
        )
        permissions.push({ action: 'delete', granted: allowDelete })
        break
      case 'admin':
        permissions.push({ action: 'admin', granted: false }) // Only admins get admin access
        break
    }

    return permissions
  }

  private static logIDORAttempt(
    request: NextRequest | undefined,
    userId: string | undefined,
    resourceType: string,
    resourceId: string,
    reason: string
  ): void {
    if (!request) {
      return
    }

    SecurityLogger.logSecurityEvent('IDOR_ATTEMPT', request, {
      userId,
      severity: 'high',
      description: `IDOR attempt detected: ${reason}`,
      details: {
        resourceType: DataSanitizer.sanitizeText(resourceType),
        resourceId: DataSanitizer.sanitizeText(resourceId),
        reason: DataSanitizer.sanitizeText(reason),
        timestamp: Date.now()
      },
      blocked: true
    })
  }
}

/**
 * Middleware wrapper for IDOR protection
 */
export function withIDORProtection(
  resourceType: string,
  resourceIdParam: string = 'id',
  action: 'read' | 'write' | 'delete' | 'admin' = 'read'
) {
  return function (
    handler: (request: NextRequest, context: any) => Promise<Response>
  ) {
    return async (request: NextRequest, context: any): Promise<Response> => {
      try {
        // Extract resource ID from URL params
        const resourceId = context.params?.[resourceIdParam]
        
        if (!resourceId) {
          return new Response(
            JSON.stringify({ error: 'Resource ID required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Extract user ID from request (implement based on your auth system)
        const userId = await extractUserIdFromRequest(request)

        // Check IDOR protection
        const protection = await IDORProtection.checkResourceAccess(
          userId,
          resourceType,
          resourceId,
          action,
          request
        )

        if (!protection.allowed) {
          return new Response(
            JSON.stringify({ 
              error: protection.reason || 'Access denied',
              code: 'ACCESS_DENIED'
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Add protection result to context
        context.idorProtection = protection

        return handler(request, context)
      } catch (error) {
        console.error('IDOR protection middleware error:', error)
        
        return new Response(
          JSON.stringify({ error: 'Access check failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }
}

/**
 * Helper function to extract user ID from request
 * This should be implemented based on your authentication system
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  try {
    // Example implementation - replace with your actual auth system
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  } catch (error) {
    console.error('Error extracting user ID:', error)
    return undefined
  }
}

/**
 * Database query helper with automatic IDOR protection
 */
export class SecureQueryWithIDOR {
  static async selectWithOwnership<T>(
    userId: string | undefined,
    resourceType: string,
    filters: Record<string, any> = {},
    options: {
      columns?: string
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: T[] | null; error: string | null }> {
    try {
      // Add ownership filter
      const ownershipFilter = IDORProtection.createOwnershipFilter(userId, resourceType)
      
      if (ownershipFilter === null) {
        return { data: null, error: 'Access denied' }
      }

      const combinedFilters = { ...filters, ...ownershipFilter }
      
      const supabase = await createClient()
      let query = supabase
        .from(resourceType)
        .select(options.columns || '*')

      // Apply filters
      Object.entries(combinedFilters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        })
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1)
      }

      const result = await query

      if (result.error) {
        return { data: null, error: result.error.message }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Secure query with IDOR error:', error)
      return { data: null, error: 'Query failed' }
    }
  }
}

export default IDORProtection