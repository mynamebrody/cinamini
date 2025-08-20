import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import GamesList from "@/components/games-list"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Banner } from "@/components/banner"
import AuthHashProcessor from "@/components/auth-hash-processor"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-neutral-900 font-funnel-display-bold">Connect Supabase to get started</h1>
          <p className="text-neutral-600">Please configure your Supabase connection to continue.</p>
        </div>
      </div>
    )
  }

  // Get the user from the server (but don't require login)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user profile for display name/username if logged in
  let displayName = null
  if (user) {
    const { data: profile } = await supabase
      .from('cinamini_user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    displayName = profile?.display_name || user.email
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Auth Hash Processor for invite links */}
      <AuthHashProcessor 
        redirectPath="/profile"
        successMessage="Welcome to cinamini! Redirecting to your profile..."
        processingMessage="Processing invitation..."
      />
      
      {/* Optional Banner */}
      {/* <Banner
        message="🎬 Free game with an annual Cinema subscription. Ends soon."
        show={false} // Toggle this to show/hide banner
        className="bg-[#ffd92e] text-black py-3"
      /> */}

      {/* Navigation Header */}
      <SiteHeader user={user} displayName={displayName} />

      {/* Games Content - flex-1 makes this grow to fill available space */}
      <main className="relative flex-1">
        <GamesList isAuthenticated={!!user} />
      </main>

      {/* Footer - Always at bottom */}
      <SiteFooter />
    </div>
  )
}