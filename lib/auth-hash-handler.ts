import { createClient } from '@/lib/supabase/client'

export interface AuthHashParams {
  access_token?: string
  refresh_token?: string
  expires_at?: string
  expires_in?: string
  token_type?: string
  type?: string
}

/**
 * Parse authentication parameters from URL hash fragment
 */
export function parseAuthHash(): AuthHashParams | null {
  if (typeof window === 'undefined') {
    return null
  }

  const hash = window.location.hash.substring(1) // Remove the '#'
  if (!hash) {
    return null
  }

  const params: AuthHashParams = {}
  const searchParams = new URLSearchParams(hash)

  params.access_token = searchParams.get('access_token') || undefined
  params.refresh_token = searchParams.get('refresh_token') || undefined
  params.expires_at = searchParams.get('expires_at') || undefined
  params.expires_in = searchParams.get('expires_in') || undefined
  params.token_type = searchParams.get('token_type') || undefined
  params.type = searchParams.get('type') || undefined

  // Only return if we have an access token
  return params.access_token ? params : null
}

/**
 * Process authentication hash and establish session
 */
export async function processAuthHash(): Promise<{
  success: boolean
  type?: string
  error?: string
}> {
  try {
    const authParams = parseAuthHash()
    
    if (!authParams || !authParams.access_token || !authParams.refresh_token) {
      return { success: false, error: 'No valid auth tokens found in URL' }
    }

    const supabase = createClient()

    // Set the session using the tokens from the hash
    const { data, error } = await supabase.auth.setSession({
      access_token: authParams.access_token,
      refresh_token: authParams.refresh_token
    })

    if (error) {
      console.error('Error setting session from hash:', error)
      return { success: false, error: error.message }
    }

    if (!data.session) {
      return { success: false, error: 'Failed to create session' }
    }

    // Clean up the URL hash
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    return { 
      success: true, 
      type: authParams.type 
    }

  } catch (error) {
    console.error('Error processing auth hash:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Check if current URL has auth hash parameters
 */
export function hasAuthHash(): boolean {
  if (typeof window === 'undefined') return false
  
  const hash = window.location.hash
  return hash.includes('access_token=') && hash.includes('refresh_token=')
}