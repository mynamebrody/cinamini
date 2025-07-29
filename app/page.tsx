import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Film, Trophy, Zap } from "lucide-react"
import { signOut } from "@/lib/actions"
import GamesList from "@/components/games-list"
import DailyStats from "@/components/daily-stats"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
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
    <div className="min-h-screen bg-[#161616]">
      {/* Header with dynamic content based on auth status */}
      <header className="border-b border-white/10 bg-[#161616]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">CinaMini</h1>
            {user ? (
              <p className="text-sm text-gray-400">Welcome back, {displayName}</p>
            ) : (
              <p className="text-sm text-gray-400">Daily movie puzzles for film lovers</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              // Authenticated user menu
              <>
                <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                  <a href="/profile">Profile</a>
                </Button>
                <form action={signOut}>
                  <Button type="submit" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </form>
              </>
            ) : (
              // Guest user menu
              <>
                <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                  <a href="/auth/login">Sign In</a>
                </Button>
                <Button asChild className="bg-[#B31B1B] text-white hover:bg-[#9A1A1A]">
                  <a href="/auth/sign-up">Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#B31B1B] to-[#8B1538] text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white/90">
                <Film className="w-5 h-5" />
                <span className="text-sm font-medium uppercase tracking-wide">Daily Movie Puzzles</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Test Your
                <br />
                <span className="text-yellow-300">Film Knowledge</span>
              </h1>
              <p className="text-xl text-white/90 max-w-lg">
                Challenge yourself with daily movie puzzles. From budget guessing to localized titles, discover how much you really know about cinema.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm">Daily Challenges</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm">Quick & Fun</span>
                </div>
              </div>
              
              {!user && (
                <div className="flex gap-3 pt-6">
                  <Button asChild size="lg" className="bg-white text-black hover:bg-gray-200">
                    <a href="/auth/sign-up">Start Playing Free</a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10">
                    <a href="/auth/login">Sign In</a>
                  </Button>
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <div className="w-full h-64 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 p-6 flex flex-col justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-yellow-300/20 rounded-full flex items-center justify-center mx-auto">
                      <Film className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Today's Challenge</h3>
                      <p className="text-white/80 text-sm">
                        {new Date().toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex justify-center gap-4 text-xs text-white/60">
                      <span>💰 Budget Bracket</span>
                      <span>🌍 Retitled</span>
                      <span>🎬 Cast Climb</span>
                      <span>🖼️ Poster Pixel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <GamesList isAuthenticated={!!user} />
      </main>

      {/* Daily Stats */}
      <DailyStats />
    </div>
  )
}
