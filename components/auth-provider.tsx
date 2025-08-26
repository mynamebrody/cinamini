"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitializing, setIsInitializing] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initializeAuth = async () => {
      const supabase = createClient()
      if (!supabase) {
        setIsInitializing(false)
        return
      }

      try {
        // Check if user is already signed in (anonymous or regular)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // No user signed in, sign in anonymously
          const { error } = await supabase.auth.signInAnonymously()
          
          if (error) {
            console.error('Error signing in anonymously:', error)
          } else {
            // Auth state is now set; no need to refresh the page. UI will update based on state.
          }
        } else {
          // User exists - check for potential session staleness and auto-refresh if needed
          // This is especially important after account conversion
          const hasEmail = !!user.email
          const isConfirmed = !!user.email_confirmed_at
          const showsAsAnonymous = user.is_anonymous === true
          
          if (hasEmail && isConfirmed && showsAsAnonymous) {
            console.warn('Detected stale session after account conversion - auto-refreshing')
            try {
              await supabase.auth.refreshSession()
              console.log('Session auto-refresh completed successfully')
            } catch (refreshError) {
              console.error('Failed to auto-refresh stale session:', refreshError)
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeAuth()
  }, [router])

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinema-red mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}