"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isSupabaseConfigured } from "@/lib/supabase/server"

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

    const { error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
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

export async function signInWithGoogle() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. Please set up your environment variables." }
  }

  try {
    const supabase = await createServerActionClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.url) {
      redirect(data.url) // use the redirect API for server actions
    }
  } catch (error) {
    console.error("Google sign in error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    redirect("/auth/login")
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