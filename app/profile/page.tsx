import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/profile-form"

export default async function ProfilePage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#161616]">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is logged in
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
      <header className="border-b border-white/10 bg-[#161616]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="text-white hover:text-gray-300 transition-colors">
              ← Back to Home
            </a>
            <h1 className="text-xl font-bold text-white">Profile Settings</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Your Profile</h2>
            <p className="text-gray-400">Manage your account information and preferences</p>
          </div>

          {/* Profile Form */}
          <ProfileForm />
        </div>
      </main>
    </div>
  )
}