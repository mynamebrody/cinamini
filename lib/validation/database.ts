import { createClient } from "@/lib/supabase/server"
import { DataSanitizer } from "./sanitization"
import { validateUUID } from "./schemas"
import { SupabaseClient } from "@supabase/supabase-js"

// Database query result types
export interface QueryResult<T = any> {
  data: T | null
  error: string | null
  count?: number
}

export interface PaginatedResult<T = any> extends QueryResult<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Security context for database operations
export interface DatabaseSecurityContext {
  userId?: string
  isAuthenticated: boolean
  isAdmin: boolean
  ipAddress?: string
  userAgent?: string
}

/**
 * Secure Database Query Builder
 * Provides parameterized queries and automatic validation to prevent SQL injection
 */
export class SecureQueryBuilder {
  private supabase: SupabaseClient
  private context: DatabaseSecurityContext

  constructor(supabase: SupabaseClient, context: DatabaseSecurityContext) {
    this.supabase = supabase
    this.context = context
  }

  /**
   * Secure select query with automatic RLS enforcement
   */
  async select<T>(
    table: string,
    columns: string = '*',
    filters: Record<string, any> = {},
    options: {
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
      offset?: number
      count?: boolean
    } = {}
  ): Promise<QueryResult<T[]>> {
    try {
      // Validate table name (prevent injection through table name)
      const sanitizedTable = this.validateTableName(table)
      if (!sanitizedTable) {
        return { data: null, error: 'Invalid table name' }
      }

      // Validate column names
      const sanitizedColumns = this.validateColumns(columns)
      if (!sanitizedColumns) {
        return { data: null, error: 'Invalid column specification' }
      }

      // Build query with sanitized inputs
      let query = this.supabase
        .from(sanitizedTable)
        .select(sanitizedColumns, { count: options.count ? 'exact' : undefined })

      // Apply filters with parameter binding (Supabase handles this securely)
      for (const [key, value] of Object.entries(filters)) {
        const sanitizedKey = this.validateColumnName(key)
        if (!sanitizedKey) continue

        if (value === null) {
          query = query.is(sanitizedKey, null)
        } else if (Array.isArray(value)) {
          query = query.in(sanitizedKey, value)
        } else if (typeof value === 'string' && value.includes('%')) {
          // For LIKE queries, sanitize the pattern
          const sanitizedValue = DataSanitizer.sanitizeText(value)
          query = query.ilike(sanitizedKey, sanitizedValue)
        } else {
          query = query.eq(sanitizedKey, value)
        }
      }

      // Apply ordering
      if (options.orderBy) {
        const sanitizedColumn = this.validateColumnName(options.orderBy.column)
        if (sanitizedColumn) {
          query = query.order(sanitizedColumn, { ascending: options.orderBy.ascending ?? true })
        }
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(Math.min(options.limit, 1000)) // Cap at 1000 records
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1)
      }

      const result = await query

      if (result.error) {
        console.error('Database query error:', result.error)
        return { data: null, error: 'Database query failed' }
      }

      return {
        data: result.data,
        error: null,
        count: result.count ?? undefined
      }
    } catch (error) {
      console.error('Secure select error:', error)
      return { data: null, error: 'Internal database error' }
    }
  }

  /**
   * Secure insert with data validation and sanitization
   */
  async insert<T>(
    table: string,
    data: Record<string, any> | Record<string, any>[],
    options: { returning?: string; upsert?: boolean } = {}
  ): Promise<QueryResult<T>> {
    try {
      const sanitizedTable = this.validateTableName(table)
      if (!sanitizedTable) {
        return { data: null, error: 'Invalid table name' }
      }

      // Sanitize input data
      const sanitizedData = Array.isArray(data) 
        ? data.map(item => this.sanitizeRowData(item))
        : this.sanitizeRowData(data)

      // Validate user can insert into this table
      if (!this.canModifyTable(sanitizedTable)) {
        return { data: null, error: 'Insufficient permissions' }
      }

      let query = this.supabase
        .from(sanitizedTable)
        .insert(sanitizedData)

      if (options.returning) {
        const sanitizedColumns = this.validateColumns(options.returning)
        if (sanitizedColumns) {
          query = query.select(sanitizedColumns)
        }
      }

      if (options.upsert) {
        query = query.upsert(sanitizedData)
      }

      const result = await query

      if (result.error) {
        console.error('Database insert error:', result.error)
        return { data: null, error: this.translateDatabaseError(result.error.message) }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Secure insert error:', error)
      return { data: null, error: 'Internal database error' }
    }
  }

  /**
   * Secure update with ownership validation
   */
  async update<T>(
    table: string,
    data: Record<string, any>,
    filters: Record<string, any>,
    options: { returning?: string } = {}
  ): Promise<QueryResult<T>> {
    try {
      const sanitizedTable = this.validateTableName(table)
      if (!sanitizedTable) {
        return { data: null, error: 'Invalid table name' }
      }

      // Sanitize update data
      const sanitizedData = this.sanitizeRowData(data)

      // Validate user can modify this table
      if (!this.canModifyTable(sanitizedTable)) {
        return { data: null, error: 'Insufficient permissions' }
      }

      // Enforce user ownership for user-specific tables
      const ownershipFilters = this.addOwnershipFilters(sanitizedTable, filters)

      let query = this.supabase
        .from(sanitizedTable)
        .update(sanitizedData)

      // Apply filters
      for (const [key, value] of Object.entries(ownershipFilters)) {
        const sanitizedKey = this.validateColumnName(key)
        if (sanitizedKey) {
          query = query.eq(sanitizedKey, value)
        }
      }

      if (options.returning) {
        const sanitizedColumns = this.validateColumns(options.returning)
        if (sanitizedColumns) {
          query = query.select(sanitizedColumns)
        }
      }

      const result = await query

      if (result.error) {
        console.error('Database update error:', result.error)
        return { data: null, error: this.translateDatabaseError(result.error.message) }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Secure update error:', error)
      return { data: null, error: 'Internal database error' }
    }
  }

  /**
   * Secure delete with ownership validation
   */
  async delete<T>(
    table: string,
    filters: Record<string, any>,
    options: { returning?: string } = {}
  ): Promise<QueryResult<T>> {
    try {
      const sanitizedTable = this.validateTableName(table)
      if (!sanitizedTable) {
        return { data: null, error: 'Invalid table name' }
      }

      // Validate user can delete from this table
      if (!this.canModifyTable(sanitizedTable)) {
        return { data: null, error: 'Insufficient permissions' }
      }

      // Enforce user ownership
      const ownershipFilters = this.addOwnershipFilters(sanitizedTable, filters)

      let query = this.supabase.from(sanitizedTable).delete()

      // Apply filters
      for (const [key, value] of Object.entries(ownershipFilters)) {
        const sanitizedKey = this.validateColumnName(key)
        if (sanitizedKey) {
          query = query.eq(sanitizedKey, value)
        }
      }

      if (options.returning) {
        const sanitizedColumns = this.validateColumns(options.returning)
        if (sanitizedColumns) {
          query = query.select(sanitizedColumns)
        }
      }

      const result = await query

      if (result.error) {
        console.error('Database delete error:', result.error)
        return { data: null, error: this.translateDatabaseError(result.error.message) }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Secure delete error:', error)
      return { data: null, error: 'Internal database error' }
    }
  }

  /**
   * Secure RPC call for stored procedures
   */
  async rpc<T>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<QueryResult<T>> {
    try {
      // Validate function name (whitelist approach)
      if (!this.isAllowedRpcFunction(functionName)) {
        return { data: null, error: 'RPC function not allowed' }
      }

      // Sanitize parameters
      const sanitizedParams = this.sanitizeRpcParams(params)

      const result = await this.supabase.rpc(functionName, sanitizedParams)

      if (result.error) {
        console.error('RPC error:', result.error)
        return { data: null, error: 'RPC call failed' }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Secure RPC error:', error)
      return { data: null, error: 'Internal RPC error' }
    }
  }

  // Private validation methods
  private validateTableName(table: string): string | null {
    // Whitelist of allowed tables
    const allowedTables = [
      'retitled_puzzles',
      'retitled_guesses', 
      'retitled_user_stats',
      'budget_bracket_puzzles',
      'budget_bracket_guesses',
      'budget_bracket_user_stats',
      'cinamini_user_profiles',
      'cinamini_user_stats',
      'user_favorites',
      'games'
    ]

    const sanitized = DataSanitizer.sanitizeText(table).toLowerCase()
    return allowedTables.includes(sanitized) ? sanitized : null
  }

  private validateColumnName(column: string): string | null {
    // Basic column name validation
    if (!/^[a-z_][a-z0-9_]*$/.test(column)) {
      return null
    }

    // Prevent reserved words and dangerous names
    const forbidden = ['password', 'token', 'secret', 'private', 'internal']
    if (forbidden.some(word => column.includes(word))) {
      return null
    }

    return column
  }

  private validateColumns(columns: string): string | null {
    if (columns === '*') {
      return '*'
    }

    const columnList = columns.split(',').map(col => col.trim())
    const validatedColumns = columnList
      .map(col => this.validateColumnName(col))
      .filter(col => col !== null)

    return validatedColumns.length === columnList.length 
      ? validatedColumns.join(',') 
      : null
  }

  private sanitizeRowData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = this.validateColumnName(key)
      if (!sanitizedKey) continue

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = DataSanitizer.sanitizeForDatabase(value)
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[sanitizedKey] = DataSanitizer.sanitizeObject(value)
      } else {
        sanitized[sanitizedKey] = value
      }
    }

    return sanitized
  }

  private canModifyTable(table: string): boolean {
    // Admin can modify any table
    if (this.context.isAdmin) {
      return true
    }

    // Must be authenticated for user-specific tables
    if (!this.context.isAuthenticated) {
      return false
    }

    // Read-only tables that users cannot modify directly
    const readOnlyTables = ['retitled_puzzles', 'budget_bracket_puzzles', 'games']
    if (readOnlyTables.includes(table)) {
      return false
    }

    return true
  }

  private addOwnershipFilters(table: string, filters: Record<string, any>): Record<string, any> {
    // Tables that require user ownership
    const userOwnedTables = [
      'retitled_guesses',
      'retitled_user_stats',
      'budget_bracket_guesses', 
      'budget_bracket_user_stats',
      'cinamini_user_profiles',
      'cinamini_user_stats',
      'user_favorites'
    ]

    if (userOwnedTables.includes(table) && this.context.userId) {
      return { ...filters, user_id: this.context.userId }
    }

    return filters
  }

  private isAllowedRpcFunction(functionName: string): boolean {
    const allowedFunctions = [
      'get_user_stats',
      'update_user_streak',
      'get_leaderboard',
      'get_puzzle_analytics',
      'validate_guess'
    ]

    return allowedFunctions.includes(functionName)
  }

  private sanitizeRpcParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(params)) {
      const sanitizedKey = DataSanitizer.sanitizeText(key)
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = DataSanitizer.sanitizeForDatabase(value)
      } else if (validateUUID(String(value))) {
        sanitized[sanitizedKey] = DataSanitizer.sanitizeUuid(String(value))
      } else {
        sanitized[sanitizedKey] = value
      }
    }

    return sanitized
  }

  private translateDatabaseError(error: string): string {
    // Map technical database errors to user-friendly messages
    // while not revealing internal details
    if (error.includes('unique constraint') || error.includes('duplicate key')) {
      return 'This record already exists'
    }
    if (error.includes('foreign key')) {
      return 'Referenced record does not exist'
    }
    if (error.includes('not null constraint')) {
      return 'Required field is missing'
    }
    if (error.includes('check constraint')) {
      return 'Invalid data format'
    }
    if (error.includes('permission denied') || error.includes('insufficient privilege')) {
      return 'Access denied'
    }

    // Generic error for unknown cases
    return 'Database operation failed'
  }
}

/**
 * Factory function to create a secure query builder
 */
export async function createSecureQueryBuilder(
  context: DatabaseSecurityContext
): Promise<SecureQueryBuilder> {
  const supabase = await createClient()
  return new SecureQueryBuilder(supabase, context)
}

/**
 * High-level secure database operations
 */
export class SecureDatabase {
  /**
   * Get user's own data with automatic ownership enforcement
   */
  static async getUserData<T>(
    userId: string,
    table: string,
    filters: Record<string, any> = {}
  ): Promise<QueryResult<T[]>> {
    const context: DatabaseSecurityContext = {
      userId,
      isAuthenticated: true,
      isAdmin: false
    }

    const queryBuilder = await createSecureQueryBuilder(context)
    return queryBuilder.select<T>(table, '*', { ...filters, user_id: userId })
  }

  /**
   * Update user's own data with validation
   */
  static async updateUserData<T>(
    userId: string,
    table: string,
    data: Record<string, any>,
    filters: Record<string, any> = {}
  ): Promise<QueryResult<T>> {
    const context: DatabaseSecurityContext = {
      userId,
      isAuthenticated: true,
      isAdmin: false
    }

    const queryBuilder = await createSecureQueryBuilder(context)
    return queryBuilder.update<T>(table, data, { ...filters, user_id: userId })
  }

  /**
   * Insert data with automatic user assignment
   */
  static async insertUserData<T>(
    userId: string,
    table: string,
    data: Record<string, any>
  ): Promise<QueryResult<T>> {
    const context: DatabaseSecurityContext = {
      userId,
      isAuthenticated: true,
      isAdmin: false
    }

    const queryBuilder = await createSecureQueryBuilder(context)
    return queryBuilder.insert<T>(table, { ...data, user_id: userId })
  }

  /**
   * Get public data (no user context required)
   */
  static async getPublicData<T>(
    table: string,
    filters: Record<string, any> = {},
    options: {
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
      offset?: number
    } = {}
  ): Promise<QueryResult<T[]>> {
    const context: DatabaseSecurityContext = {
      isAuthenticated: false,
      isAdmin: false
    }

    const queryBuilder = await createSecureQueryBuilder(context)
    return queryBuilder.select<T>(table, '*', filters, options)
  }
}

export default SecureQueryBuilder