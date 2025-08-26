import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import ForgotPasswordForm from "@/components/forgot-password-form"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import Link from "next/link"

export default async function ForgotPasswordPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="mx-auto max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4 text-neutral-900 font-funnel-display-bold">Connect Supabase to get started</h1>
          <p className="text-neutral-600">Please set up your Supabase environment variables to enable authentication.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get user data for header
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get display name if user exists
  let displayName = null
  if (user && !user.is_anonymous) {
    try {
      const { data: profile } = await supabase
        .from('cinamini_user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single()
      displayName = profile?.display_name || null
    } catch (error) {
      // Profile doesn't exist yet, that's fine
    }
  }

  // If already logged in, redirect to home
  if (session) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <SiteHeader user={user} displayName={displayName} />
        
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="mx-auto max-w-md p-6 text-center">
            <p className="text-neutral-600">You are already logged in.</p>
            <Link href="/" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
              Go to home
            </Link>
          </div>
        </main>
        
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader user={user} displayName={displayName} />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <ForgotPasswordForm />
      </main>
      
      <SiteFooter />
    </div>
  )
}