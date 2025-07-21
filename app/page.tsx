import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { signOut } from "@/lib/actions"
import MovieSearch from "@/components/movie-search"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Get the user from the server
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-[#161616]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Cinamini</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-300">Welcome, {user.email}</span>
              <form action={signOut}>
                <Button type="submit" className="bg-[#2b725e] hover:bg-[#235e4c] text-white">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MovieSearch />
      </main>
    </div>
  )
}
