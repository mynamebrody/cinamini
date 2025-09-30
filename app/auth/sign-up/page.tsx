import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/signup-form"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <h1 className="text-2xl font-bold mb-4 text-neutral-900 font-funnel-display-bold">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in but not anonymous, redirect appropriately
  if (user && !user.is_anonymous) {
    const params = await searchParams
    const redirectUrl = params.redirect || "/"
    redirect(redirectUrl)
  }

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
    } catch {
      // Profile doesn't exist yet, that's fine
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader user={user} displayName={displayName} />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={<div>Loading...</div>}>
          <SignUpForm />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  )
}
