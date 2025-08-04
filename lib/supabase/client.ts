import { createBrowserClient } from '@supabase/ssr'

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a fresh Supabase client for Client Components (following SSR guide)
export function createClient() {
  if (!isSupabaseConfigured) {
    return null
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// For backward compatibility - but components should use createClient() instead
export const getSupabaseClient = createClient
export const supabase = createClient()