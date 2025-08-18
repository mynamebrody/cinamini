"use client"

import { useState } from 'react'
import { signInWithProvider } from '@/lib/actions'

type AuthProvider = 'google' | 'apple' | 'email'

interface UseOAuthSignInReturn {
  loading: boolean
  error: string | null
  signIn: (provider: AuthProvider) => Promise<void>
}

const getErrorMessage = (provider: AuthProvider, error: string): string => {
  // Check for common error patterns and provide user-friendly messages
  if (error.includes('not configured')) {
    return 'Authentication is temporarily unavailable. Please try again later.'
  }
  
  if (error.includes('Invalid authentication provider')) {
    return `${provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Email'} sign-in is not available. Please try a different method.`
  }
  
  if (error.includes('Failed to initiate')) {
    return `Unable to connect to ${provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Email'}. Please check your internet connection and try again.`
  }
  
  if (error.includes('Failed to generate authentication URL')) {
    return 'Unable to start the sign-in process. Please try again.'
  }
  
  // Default error message
  return error || 'An unexpected error occurred. Please try again.'
}

export default function useOAuthSignIn(): UseOAuthSignInReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (provider: AuthProvider) => {
    try {
      setLoading(true)
      setError(null)

      const result = await signInWithProvider(provider)

      if (result.error) {
        const friendlyError = getErrorMessage(provider, result.error)
        setError(friendlyError)
        return
      }

      if (result.redirectUrl) {
        // For social providers, redirect to OAuth URL
        // For email provider, it will redirect to the login form
        window.location.href = result.redirectUrl
        return
      }

      // This shouldn't happen, but handle the case where we get success without a redirect URL
      if (result.success && !result.redirectUrl) {
        setError('Authentication completed but no redirect was provided. Please try signing in again.')
        return
      }

    } catch (error) {
      console.error('OAuth sign-in error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      // Don't set loading to false if we're redirecting
      if (!window.location.href.includes('oauth')) {
        setLoading(false)
      }
    }
  }

  return {
    loading,
    error,
    signIn
  }
}