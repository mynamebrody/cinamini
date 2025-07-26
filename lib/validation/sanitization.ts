import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify with JSDOM for server-side use
const window = new JSDOM('').window as unknown as Window
const purify = DOMPurify(window)

// Configure DOMPurify with strict settings
purify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
  FORCE_BODY: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'img', 'svg', 'math'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  USE_PROFILES: { html: true }
})

// Sanitization functions
export class DataSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }
    return purify.sanitize(input, { RETURN_DOM_FRAGMENT: false })
  }

  /**
   * Sanitize plain text input - removes/escapes dangerous characters
   */
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }
    
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const entityMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        }
        return entityMap[match] || match
      })
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .trim()
  }

  /**
   * Sanitize search queries to prevent injection attacks
   */
  static sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') {
      return ''
    }

    return query
      .replace(/[^\w\s\-_.]/g, '') // Only allow word characters, spaces, hyphens, underscores, dots
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()
      .substring(0, 100) // Limit length
  }

  /**
   * Sanitize SQL-like inputs to prevent injection (though we use parameterized queries)
   */
  static sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC|EXECUTE|INSERT|MERGE|SELECT|UPDATE|UNION|TRUNCATE)\b)/gi,
      /(--|\/\*|\*\/|;|'|"|`)/g,
      /(\bOR\b|\bAND\b).*?(\b=\b|\bLIKE\b)/gi,
      /(\b1\b|\btrue\b).*?(\b=\b|\bIS\b).*?(\b1\b|\btrue\b)/gi
    ]

    let sanitized = input
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })

    return sanitized.trim()
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') {
      return 'untitled'
    }

    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .substring(0, 255) // Limit length
      .toLowerCase()
  }

  /**
   * Sanitize URLs
   */
  static sanitizeUrl(url: string): string | null {
    if (typeof url !== 'string') {
      return null
    }

    try {
      const parsed = new URL(url)
      
      // Only allow safe protocols
      const allowedProtocols = ['http:', 'https:']
      if (!allowedProtocols.includes(parsed.protocol)) {
        return null
      }

      // Remove potential XSS in URL
      const sanitized = parsed.toString()
      if (sanitized.includes('<script') || sanitized.includes('javascript:')) {
        return null
      }

      return sanitized
    } catch {
      return null
    }
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      return ''
    }

    return email
      .toLowerCase()
      .replace(/[^\w@.-]/g, '') // Only allow word chars, @, dots, hyphens
      .substring(0, 254) // RFC 5321 limit
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhoneNumber(phone: string): string {
    if (typeof phone !== 'string') {
      return ''
    }

    return phone
      .replace(/[^\d+()-.\s]/g, '') // Only allow digits, +, (), -, ., space
      .substring(0, 20)
  }

  /**
   * Sanitize JSON input to prevent injection
   */
  static sanitizeJsonString(jsonString: string): string {
    if (typeof jsonString !== 'string') {
      return '{}'
    }

    try {
      // Parse and stringify to normalize and validate
      const parsed = JSON.parse(jsonString)
      
      // Recursively sanitize string values in the JSON
      const sanitizeJsonValue = (value: any): any => {
        if (typeof value === 'string') {
          return this.sanitizeText(value)
        } else if (Array.isArray(value)) {
          return value.map(sanitizeJsonValue)
        } else if (value !== null && typeof value === 'object') {
          const sanitized: any = {}
          for (const [key, val] of Object.entries(value)) {
            const sanitizedKey = this.sanitizeText(key)
            sanitized[sanitizedKey] = sanitizeJsonValue(val)
          }
          return sanitized
        }
        return value
      }

      return JSON.stringify(sanitizeJsonValue(parsed))
    } catch {
      return '{}'
    }
  }

  /**
   * Deep sanitize an object recursively
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const sanitized = {} as T
    
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeText(key) as keyof T
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(value) as T[keyof T]
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item => 
          typeof item === 'string' ? this.sanitizeText(item) : 
          typeof item === 'object' ? this.sanitizeObject(item) : item
        ) as T[keyof T]
      } else if (value !== null && typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeObject(value) as T[keyof T]
      } else {
        sanitized[sanitizedKey] = value
      }
    }

    return sanitized
  }

  /**
   * Sanitize user input for database operations
   */
  static sanitizeForDatabase(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .replace(/[\x00\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
          case '\x00': return '\\0'
          case '\x08': return '\\b'
          case '\x09': return '\\t'
          case '\x1a': return '\\z'
          case '\n': return '\\n'
          case '\r': return '\\r'
          case '"': case "'": case '\\': case '%': return '\\' + char
          default: return char
        }
      })
      .substring(0, 1000) // Reasonable length limit
  }

  /**
   * Strip all HTML tags and return plain text
   */
  static stripHtml(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
  }

  /**
   * Validate and sanitize UUID
   */
  static sanitizeUuid(uuid: string): string | null {
    if (typeof uuid !== 'string') {
      return null
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const cleaned = uuid.toLowerCase().replace(/[^0-9a-f-]/g, '')
    
    return uuidRegex.test(cleaned) ? cleaned : null
  }

  /**
   * Sanitize integer input
   */
  static sanitizeInteger(input: any, min?: number, max?: number): number | null {
    const parsed = parseInt(String(input), 10)
    
    if (isNaN(parsed)) {
      return null
    }

    if (min !== undefined && parsed < min) {
      return min
    }

    if (max !== undefined && parsed > max) {
      return max
    }

    return parsed
  }

  /**
   * Sanitize float input
   */
  static sanitizeFloat(input: any, min?: number, max?: number): number | null {
    const parsed = parseFloat(String(input))
    
    if (isNaN(parsed)) {
      return null
    }

    if (min !== undefined && parsed < min) {
      return min
    }

    if (max !== undefined && parsed > max) {
      return max
    }

    return parsed
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input
    }

    const str = String(input).toLowerCase()
    return ['true', '1', 'yes', 'on'].includes(str)
  }

  /**
   * Rate limit key sanitization (for Redis keys)
   */
  static sanitizeRateLimitKey(key: string): string {
    if (typeof key !== 'string') {
      return 'unknown'
    }

    return key
      .replace(/[^a-zA-Z0-9:_-]/g, '_')
      .substring(0, 100)
  }

  /**
   * Comprehensive input sanitization for API requests
   */
  static sanitizeApiInput(input: any): any {
    if (input === null || input === undefined) {
      return input
    }

    if (typeof input === 'string') {
      return this.sanitizeText(input)
    }

    if (typeof input === 'number' || typeof input === 'boolean') {
      return input
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeApiInput(item))
    }

    if (typeof input === 'object') {
      return this.sanitizeObject(input)
    }

    return input
  }
}

// Export individual functions for convenience
export const {
  sanitizeHtml,
  sanitizeText,
  sanitizeSearchQuery,
  sanitizeSqlInput,
  sanitizeFileName,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeJsonString,
  sanitizeObject,
  sanitizeForDatabase,
  stripHtml,
  sanitizeUuid,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeRateLimitKey,
  sanitizeApiInput
} = DataSanitizer

// Sanitization middleware function
export function sanitizeRequestBody<T>(body: T): T {
  return DataSanitizer.sanitizeApiInput(body) as T
}

// Type-safe sanitization helpers
export function sanitizeTypedInput<T>(
  input: unknown,
  schema: { parse: (input: unknown) => T },
  sanitize: boolean = true
): T {
  const sanitized = sanitize ? DataSanitizer.sanitizeApiInput(input) : input
  return schema.parse(sanitized)
}

export default DataSanitizer