"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import type { Provider } from '@supabase/supabase-js'

// Helper function to create Supabase client for server actions
async function createServerActionClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Update the signIn function to handle redirects properly
export async function signIn(prevState: any, formData: FormData) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. Please set up your environment variables." }
  }

  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    const supabase = await createServerActionClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    // Return success instead of redirecting directly
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Update the signUp function to handle potential null formData
export async function signUp(prevState: any, formData: FormData) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. Please set up your environment variables." }
  }

  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    const supabase = await createServerActionClient()

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?confirmed=true`
    
    const { error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Check your email to confirm your account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    redirect("/")
    return
  }

  try {
    const supabase = await createServerActionClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error("Sign out error:", error)
  }

  redirect("/auth/login")
}

// Password reset actions
export async function resetPasswordForEmail(prevState: any, formData: FormData) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. Please set up your environment variables." }
  }

  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")

  // Validate required fields
  if (!email) {
    return { error: "Email is required" }
  }

  try {
    const supabase = await createServerActionClient()

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
    console.log("Password reset redirectTo:", redirectTo)
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toString(),
      {
        redirectTo,
      }
    )

    if (error) {
      return { error: error.message }
    }

    // Always return success to prevent email enumeration
    return { success: true }
  } catch (error) {
    console.error("Password reset error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function updatePassword(prevState: any, formData: FormData) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. Please set up your environment variables." }
  }

  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")

  // Validate required fields
  if (!password || !confirmPassword) {
    return { error: "Password and confirmation are required" }
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  // Check password length
  if (password.toString().length < 6) {
    return { error: "Password must be at least 6 characters long" }
  }

  try {
    const supabase = await createServerActionClient()

    const { error } = await supabase.auth.updateUser({
      password: password.toString()
    })

    if (error) {
      return { error: error.message }
    }

    // Return success
    return { success: true }
  } catch (error) {
    console.error("Password update error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Types for provider authentication
type SocialProvider = 'google' | 'apple'
type AuthProvider = SocialProvider | 'email'

type SignInWithProviderResponse = {
  success?: boolean
  redirectUrl?: string
  error?: string
}

// Helper function to get the correct base URL
function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://cinamini.app'
  }
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// Social authentication server action
export async function signInWithProvider(provider: AuthProvider): Promise<SignInWithProviderResponse> {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. Please set up your environment variables." }
  }

  // Handle email provider case (redirect to login form)
  if (provider === 'email') {
    return { redirectUrl: '/auth/login' }
  }

  // Validate social provider
  const socialProviders: SocialProvider[] = ['google', 'apple']
  if (!socialProviders.includes(provider as SocialProvider)) {
    return { error: "Invalid authentication provider specified." }
  }

  try {
    const supabase = await createServerActionClient()
    
    // Build the redirect URL for OAuth callback
    const baseUrl = getBaseUrl()
    const redirectTo = `${baseUrl}/auth/callback`
    
    // Map our provider names to Supabase provider names
    const providerMap: Record<SocialProvider, Provider> = {
      google: 'google',
      apple: 'apple'
    }
    
    const supabaseProvider = providerMap[provider as SocialProvider]
    
    // Initiate OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider,
      options: {
        redirectTo,
        scopes: provider === 'google' ? 'openid email profile' : undefined,
        queryParams: {
          // Add provider context for callback handling
          provider: provider
        }
      }
    })
    
    if (error) {
      console.error(`${provider} auth error:`, error)
      return { error: `Failed to initiate ${provider} authentication: ${error.message}` }
    }
    
    // Return the OAuth URL for client-side redirect
    if (data?.url) {
      return { success: true, redirectUrl: data.url }
    }
    
    return { error: "Failed to generate authentication URL. Please try again." }
    
  } catch (error) {
    console.error(`${provider} authentication error:`, error)
    return { error: "An unexpected error occurred during authentication. Please try again." }
  }
}