import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/site-footer"
import Link from "next/link"
import StatsPageContent from "@/components/stats-page-content"

export default async function StatsPage() {
  
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <h1 className="text-2xl font-bold mb-4 text-neutral-900 font-funnel-display-bold">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is logged in using reliable server-side state
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user or anonymous user, redirect to sign-up
  if (!user || user.is_anonymous) {
    redirect("/auth/sign-up")
  }

  // User is authenticated and confirmed - render stats page
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="text-neutral-900 hover:text-[rgb(153,37,29)] transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-neutral-900 font-funnel-display-bold">Your Statistics</h1>
            <div className="w-[120px]"></div> {/* Spacer to center the title */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1">
        <StatsPageContent />
      </main>
      <SiteFooter />
    </div>
  )
}