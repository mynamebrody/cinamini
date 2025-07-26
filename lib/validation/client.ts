'use client'

import { z, ZodSchema, ZodError } from 'zod'
import DOMPurify from 'dompurify'

// Client-side validation result
export interface ClientValidationResult<T = any> {
  success: boolean
  data?: T
  errors?: string[]
  fieldErrors?: Record<string, string[]>
}

// Form validation state
export interface FormValidationState {
  isValid: boolean
  isValidating: boolean
  errors: Record<string, string[]>
  touched: Record<string, boolean>
  submitted: boolean
}

/**
 * Client-side validation utilities with XSS protection
 */
export class ClientValidator {
  /**
   * Validate data against a Zod schema
   */
  static validate<T>(schema: ZodSchema<T>, data: any): ClientValidationResult<T> {
    try {
      // Sanitize input before validation
      const sanitizedData = this.sanitizeInput(data)
      const validData = schema.parse(sanitizedData)
      
      return { success: true, data: validData }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {}
        const errors: string[] = []

        error.issues.forEach(issue => {
          const path = issue.path.join('.')
          const message = this.sanitizeErrorMessage(issue.message)

          if (path) {
            if (!fieldErrors[path]) {
              fieldErrors[path] = []
            }
            fieldErrors[path].push(message)
          } else {
            errors.push(message)
          }
        })

        return { success: false, errors, fieldErrors }
      }

      return { success: false, errors: ['Validation failed'] }
    }
  }

  /**
   * Validate a single field
   */
  static validateField<T>(
    schema: ZodSchema<T>,
    fieldName: string,
    value: any
  ): ClientValidationResult<any> {
    try {
      // Create a partial schema for single field validation
      const fieldSchema = schema.pick ? schema.pick({ [fieldName]: true }) : schema
      const sanitizedValue = this.sanitizeInput({ [fieldName]: value })
      
      const result = fieldSchema.safeParse(sanitizedValue)
      
      if (result.success) {
        return { success: true, data: result.data[fieldName] }
      } else {
        const fieldErrors: Record<string, string[]> = {}
        const errors = result.error.issues
          .filter(issue => issue.path.includes(fieldName))
          .map(issue => this.sanitizeErrorMessage(issue.message))
        
        if (errors.length > 0) {
          fieldErrors[fieldName] = errors
        }
        
        return { success: false, fieldErrors, errors }
      }
    } catch (error) {
      return { 
        success: false, 
        fieldErrors: { [fieldName]: ['Invalid input'] },
        errors: ['Field validation failed']
      }
    }
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: any): any {
    if (input === null || input === undefined) {
      return input
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input)
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item))
    }

    if (typeof input === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeString(key)
        sanitized[sanitizedKey] = this.sanitizeInput(value)
      }
      return sanitized
    }

    return input
  }

  /**
   * Sanitize string input with DOMPurify
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input)
    }

    // Use DOMPurify to remove XSS attempts
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })

    // Additional sanitization for common attack vectors
    return sanitized
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
   * Sanitize HTML content for display
   */
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'img', 'svg'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    })
  }

  /**
   * Validate and sanitize form data
   */
  static validateForm<T>(
    schema: ZodSchema<T>,
    formData: FormData | Record<string, any>
  ): ClientValidationResult<T> {
    let data: Record<string, any>

    if (formData instanceof FormData) {
      data = {}
      formData.forEach((value, key) => {
        // Handle multiple values for the same key
        if (data[key]) {
          if (Array.isArray(data[key])) {
            data[key].push(value)
          } else {
            data[key] = [data[key], value]
          }
        } else {
          data[key] = value
        }
      })
    } else {
      data = formData
    }

    return this.validate(schema, data)
  }

  /**
   * Real-time field validation
   */
  static createFieldValidator<T>(schema: ZodSchema<T>, fieldName: string) {
    let timeoutId: NodeJS.Timeout | null = null

    return {
      validate: (value: any, callback: (result: ClientValidationResult<any>) => void) => {
        // Debounce validation
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
          const result = this.validateField(schema, fieldName, value)
          callback(result)
        }, 300) // 300ms debounce
      },

      validateSync: (value: any) => {
        return this.validateField(schema, fieldName, value)
      }
    }
  }

  /**
   * Password strength validation
   */
  static validatePasswordStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('Password must be at least 8 characters long')
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Password must contain lowercase letters')
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Password must contain uppercase letters')
    }

    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('Password must contain numbers')
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('Password must contain special characters')
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1
      feedback.push('Avoid repeating characters')
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1
      feedback.push('Avoid common sequences')
    }

    return {
      score: Math.max(0, Math.min(5, score)),
      feedback,
      isStrong: score >= 4
    }
  }

  /**
   * Email validation with domain checking
   */
  static validateEmail(email: string): {
    isValid: boolean
    errors: string[]
    suggestions?: string[]
  } {
    const errors: string[] = []
    const suggestions: string[] = []

    // Sanitize email
    const sanitizedEmail = this.sanitizeString(email).toLowerCase()

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedEmail)) {
      errors.push('Invalid email format')
      return { isValid: false, errors }
    }

    // Check for common typos in domains
    const commonDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'apple.com', 'icloud.com', 'aol.com', 'live.com'
    ]

    const [localPart, domain] = sanitizedEmail.split('@')
    
    // Suggest corrections for common typos
    const domainSuggestions = this.getSimilarDomains(domain, commonDomains)
    if (domainSuggestions.length > 0) {
      suggestions.push(...domainSuggestions.map(d => `${localPart}@${d}`))
    }

    // Check for suspicious patterns
    if (localPart.length > 64) {
      errors.push('Email local part too long')
    }

    if (domain.length > 253) {
      errors.push('Email domain too long')
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
  }

  /**
   * File validation
   */
  static validateFile(
    file: File,
    options: {
      maxSize?: number
      allowedTypes?: string[]
      allowedExtensions?: string[]
    }
  ): ClientValidationResult<File> {
    const errors: string[] = []

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`File size must be less than ${Math.round(options.maxSize / 1024 / 1024)}MB`)
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`)
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`)
      }
    }

    // Sanitize filename
    const sanitizedName = this.sanitizeFilename(file.name)
    if (sanitizedName !== file.name) {
      errors.push('Filename contains invalid characters')
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? file : undefined,
      errors
    }
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .substring(0, 255)
  }

  /**
   * Rate limit validation
   */
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests: number[] = []

    return {
      check: (): { allowed: boolean; resetTime?: number } => {
        const now = Date.now()
        const windowStart = now - windowMs

        // Remove old requests
        while (requests.length > 0 && requests[0] < windowStart) {
          requests.shift()
        }

        if (requests.length >= maxRequests) {
          return {
            allowed: false,
            resetTime: requests[0] + windowMs
          }
        }

        requests.push(now)
        return { allowed: true }
      },

      remaining: (): number => {
        const now = Date.now()
        const windowStart = now - windowMs

        // Count requests in current window
        const currentRequests = requests.filter(time => time >= windowStart)
        return Math.max(0, maxRequests - currentRequests.length)
      }
    }
  }

  // Private helper methods
  private static sanitizeErrorMessage(message: string): string {
    return this.sanitizeString(message).substring(0, 200)
  }

  private static getSimilarDomains(domain: string, commonDomains: string[]): string[] {
    const suggestions: string[] = []
    
    for (const commonDomain of commonDomains) {
      const distance = this.levenshteinDistance(domain.toLowerCase(), commonDomain)
      if (distance <= 2 && distance > 0) {
        suggestions.push(commonDomain)
      }
    }

    return suggestions.slice(0, 3) // Return top 3 suggestions
  }

  private static levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        )
      }
    }

    return matrix[b.length][a.length]
  }
}

/**
 * React hook for form validation
 */
export function useFormValidation<T>(schema: ZodSchema<T>) {
  const [state, setState] = React.useState<FormValidationState>({
    isValid: false,
    isValidating: false,
    errors: {},
    touched: {},
    submitted: false
  })

  const validateField = React.useCallback((fieldName: string, value: any) => {
    setState(prev => ({ ...prev, isValidating: true }))

    const result = ClientValidator.validateField(schema, fieldName, value)
    
    setState(prev => ({
      ...prev,
      isValidating: false,
      errors: {
        ...prev.errors,
        [fieldName]: result.fieldErrors?.[fieldName] || []
      },
      touched: {
        ...prev.touched,
        [fieldName]: true
      }
    }))

    return result
  }, [schema])

  const validateForm = React.useCallback((data: any) => {
    setState(prev => ({ ...prev, isValidating: true, submitted: true }))

    const result = ClientValidator.validate(schema, data)
    
    setState(prev => ({
      ...prev,
      isValidating: false,
      isValid: result.success,
      errors: result.fieldErrors || {}
    }))

    return result
  }, [schema])

  const reset = React.useCallback(() => {
    setState({
      isValid: false,
      isValidating: false,
      errors: {},
      touched: {},
      submitted: false
    })
  }, [])

  return {
    state,
    validateField,
    validateForm,
    reset
  }
}

// Import React for the hook
declare global {
  const React: {
    useState: any
    useCallback: any
  }
}

export default ClientValidator