/**
 * Client-side security utilities for the CineMini application
 */

// CSRF token management
const CSRF_TOKEN_HEADER = 'x-csrf-token'
const CSRF_TOKEN_COOKIE = 'csrf-token'

/**
 * Get CSRF token from cookies
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null // Server-side
  }
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_TOKEN_COOKIE) {
      return decodeURIComponent(value)
    }
  }
  
  // Fallback: try to get from meta tag if set by server
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    return metaTag.getAttribute('content')
  }
  
  return null
}

/**
 * Create headers with CSRF token for API requests
 */
export function createSecureHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  }
  
  const csrfToken = getCSRFToken()
  if (csrfToken) {
    headers[CSRF_TOKEN_HEADER] = csrfToken
  }
  
  return headers
}

/**
 * Secure fetch wrapper that automatically includes CSRF tokens
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    credentials: 'same-origin', // Include cookies
    headers: createSecureHeaders(
      options.headers ? Object.fromEntries(new Headers(options.headers)) : {}
    ),
    ...options
  }
  
  return fetch(url, defaultOptions)
}

/**
 * Secure API client with error handling
 */
export class SecureAPIClient {
  private baseURL: string
  
  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; success: boolean }> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const response = await secureFetch(url, options)
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        throw new Error(
          `Rate limit exceeded. ${retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please try again later.'}`
        )
      }
      
      // Handle CSRF errors
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error?.includes('CSRF')) {
          // CSRF token might be stale, refresh the page
          window.location.reload()
          return { success: false, error: 'Security token expired, refreshing page...' }
        }
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        }
      }
      
      return {
        success: true,
        data: data.data || data
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }
  
  async get<T>(endpoint: string): Promise<{ data?: T; error?: string; success: boolean }> {
    return this.request<T>(endpoint, { method: 'GET' })
  }
  
  async post<T>(
    endpoint: string,
    body?: any
  ): Promise<{ data?: T; error?: string; success: boolean }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    })
  }
  
  async put<T>(
    endpoint: string,
    body?: any
  ): Promise<{ data?: T; error?: string; success: boolean }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    })
  }
  
  async patch<T>(
    endpoint: string,
    body?: any
  ): Promise<{ data?: T; error?: string; success: boolean }> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    })
  }
  
  async delete<T>(
    endpoint: string
  ): Promise<{ data?: T; error?: string; success: boolean }> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Default API client instance
export const apiClient = new SecureAPIClient()

/**
 * Hook for React components to use the secure API client
 */
export function useSecureAPI() {
  return {
    apiClient,
    getCSRFToken,
    createSecureHeaders,
    secureFetch
  }
}

/**
 * Utility to check if the client has a valid CSRF token
 */
export function hasValidCSRFToken(): boolean {
  const token = getCSRFToken()
  return token !== null && token.length > 0
}

/**
 * Error handling utilities
 */
export const APIErrors = {
  isRateLimit: (error: string) => error.includes('Rate limit'),
  isCSRF: (error: string) => error.includes('CSRF') || error.includes('token'),
  isAuth: (error: string) => error.includes('Authentication') || error.includes('Unauthorized'),
  isNetwork: (error: string) => error.includes('Network') || error.includes('fetch'),
  
  getMessage: (error: string): string => {
    if (APIErrors.isRateLimit(error)) {
      return 'You are making requests too quickly. Please slow down and try again.'
    }
    if (APIErrors.isCSRF(error)) {
      return 'Security verification failed. The page will refresh to fix this.'
    }
    if (APIErrors.isAuth(error)) {
      return 'You need to be logged in to perform this action.'
    }
    if (APIErrors.isNetwork(error)) {
      return 'Network connection error. Please check your internet connection.'
    }
    return error
  }
}

/**
 * Refresh CSRF token by making a light request
 */
export async function refreshCSRFToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/games', {
      method: 'GET',
      credentials: 'same-origin'
    })
    
    // The middleware should automatically set a new CSRF token
    return response.ok
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error)
    return false
  }
}