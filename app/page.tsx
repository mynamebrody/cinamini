import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import GamesList from "@/components/games-list"
import { SiteHeader } from "@/components/site-header"
import { Banner } from "@/components/banner"
import Image from "next/image"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-neutral-900">Connect Supabase to get started</h1>
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
    <div className="min-h-screen bg-white">
      {/* Optional Banner */}
      <Banner
        message="🎬 New game coming soon: Poster Pixels! Can you guess the movie from a pixelated poster?"
        show={false} // Toggle this to show/hide banner
      />

      {/* Navigation Header */}
      <SiteHeader user={user} displayName={displayName} />

      {/* Hero Section */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6">
              <p className="text-sm font-medium text-cinema-red uppercase tracking-wide mb-2">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <h1 className="font-nyt text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
                The Cinema Challenge
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-2">
                Test your movie knowledge with daily puzzles. From budget battles to cast climbs, 
                discover new depths of cinema trivia every day.
              </p>
              <p className="text-base text-neutral-500 max-w-2xl mx-auto">
                Play instantly - no sign-up required! Create an account to save your progress and compete with friends.
              </p>
            </div>

            {!user && (
              <div className="flex justify-center items-center">
                <Button asChild variant="ghost" size="md">
                  <a href="/auth/login">Sign in to save progress</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Games Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <GamesList isAuthenticated={!!user} />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-neutral-500 mb-4 sm:mb-0">
              © 2025 CinaMini. Made with lots of{" "}
              <Image
                src="/cinamini/Logomark.webp"
                alt="love"
                width={16}
                height={16}
                className="inline-block"
              />{" "}
              in Grand Rapids, MI
            </div>
            <div className="flex items-center space-x-6 text-sm text-neutral-500">
              <a href="/stats" className="hover:text-cinema-red transition-colors">
                Statistics
              </a>
              <a href="/profile" className="hover:text-cinema-red transition-colors">
                Profile
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}