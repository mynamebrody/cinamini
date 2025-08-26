"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useGameMode() {
  const [user, setUser] = useState<User | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [loading, setLoading] = useState(true)

  // Detect if user state appears stale (non-anonymous user showing as anonymous)
  const detectStaleSession = (currentUser: User | null) => {
    if (!currentUser) return false
    
    // If user has email and email_confirmed_at but is showing as anonymous, session is likely stale
    return currentUser.email && 
           currentUser.email_confirmed_at && 
           currentUser.is_anonymous === true
  }

  useEffect(() => {
    const supabase = createClient()
    
    // Check initial auth status
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // If we detect a stale session, automatically refresh
        if (detectStaleSession(user)) {
          try {
            await supabase.auth.refreshSession()
            // Get updated user data after refresh
            const { data: { user: refreshedUser } } = await supabase.auth.getUser()
            setUser(refreshedUser)
            setIsAnonymous(refreshedUser?.is_anonymous === true)
          } catch (refreshError) {
            console.error('Auto session refresh failed:', refreshError)
            setUser(user)
            setIsAnonymous(user?.is_anonymous === true)
          }
        } else {
          setUser(user)
          setIsAnonymous(user?.is_anonymous === true)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setIsAnonymous(true)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsAnonymous(session?.user?.is_anonymous === true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, isAnonymous, loading }
}