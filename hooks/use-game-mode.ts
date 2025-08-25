"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useGameMode() {
  const [user, setUser] = useState<User | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Check initial auth status
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        setIsAnonymous(user?.is_anonymous === true)
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