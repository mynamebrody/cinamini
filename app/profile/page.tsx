import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/profile-form"
import EmailConfirmationBanner from "@/components/email-confirmation-banner"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground font-funnel-display-bold">Connect Supabase to get started</h1>
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

  // If user is anonymous, redirect to sign-up to upgrade account
  if (user.is_anonymous) {
    redirect("/auth/sign-up")
  }

  // Check if email was just confirmed
  const params = await searchParams
  const emailConfirmed = params.emailConfirmed === 'true'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">
                ← Back to Home
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-foreground font-funnel-display-bold">Profile Settings</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1">
        <div className="space-y-6">
          {/* Email Confirmation Banner */}
          {emailConfirmed && <EmailConfirmationBanner />}
          {/* Profile Form */}
          <ProfileForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}