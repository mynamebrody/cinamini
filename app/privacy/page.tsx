import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default async function Privacy() {
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
    data: { user },
  } = await supabase.auth.getUser()

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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <h1 className="text-3xl font-bold text-neutral-900 font-funnel-display-bold mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-neutral max-w-none">
          <p className="text-sm text-neutral-500 mb-8">
            Last updated: August 1, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Information We Collect
            </h2>
            <p className="text-neutral-700 mb-4">
              <strong>Anonymous Sign-In:</strong> When you first visit cinamini, you are automatically signed in anonymously. Your game data (results, streaks, statistics) is stored securely on our servers using a temporary anonymous account. We do not collect any personal information during anonymous sign-in.
            </p>
            <p className="text-neutral-700 mb-4">
              <strong>With a Full Account:</strong> When you create a full account, we collect:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Account Information:</strong> Email address and display name</li>
              <li><strong>Game Data:</strong> Your game results, statistics, streaks, and preferences (including any data from your anonymous account that gets transferred)</li>
              <li><strong>Usage Data:</strong> How you interact with our games and features</li>
            </ul>
            <p className="text-neutral-700 mb-4 mt-4">
              <strong>For All Users:</strong> We collect basic analytics via Google Analytics (device type, browser, general usage patterns) and store game progress data on our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>Provide and improve our movie puzzle games</li>
              <li>Track your progress, streaks, and statistics</li>
              <li>Send you account-related communications</li>
              <li>Analyze usage to improve our games and features</li>
              <li>Ensure security and prevent misuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Information Sharing
            </h2>
            <p className="text-neutral-700 mb-4">
              We do not sell, trade, or rent your personal information. We may share data only:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>With service providers who help operate cinamini (Supabase for data storage)</li>
              <li>When required by law or to protect our rights</li>
              <li>In anonymized, aggregated form for analytics purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Anonymous Accounts
            </h2>
            <p className="text-neutral-700 mb-4">
              When you first visit cinamini, we create a temporary anonymous account for you automatically. This allows you to:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
              <li>Play all games and save your progress</li>
              <li>Track your streaks and statistics</li>
              <li>Experience the full functionality of cinamini</li>
            </ul>
            <p className="text-neutral-700 mb-4">
              <strong>Important:</strong> Anonymous accounts are temporary and tied to your browser session. If you clear your browser data or use a different device, you may lose access to your anonymous account. We recommend creating a full account to permanently save your progress.
            </p>
            <p className="text-neutral-700">
              When you create a full account, your anonymous account data is automatically transferred and permanently saved.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Data Security
            </h2>
            <p className="text-neutral-700">
              We use industry-standard security measures to protect your data, including encryption 
              and secure hosting with Supabase. However, no method of transmission over the internet 
              is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Your Rights
            </h2>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>Access and download your data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Third-Party Services
            </h2>
            <p className="text-neutral-700 mb-4">
              cinamini uses:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Google Analytics:</strong> To understand how users interact with our site</li>
              <li><strong>The Movie Database (TMDB):</strong> For movie information and images</li>
              <li><strong>Supabase:</strong> For authentication and data storage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Children&apos;s Privacy
            </h2>
            <p className="text-neutral-700">
              cinamini is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Contact Us
            </h2>
            <p className="text-neutral-700">
              Questions about this Privacy Policy? Contact us at{' '}
              <a href="mailto:privacy@cinamini.app" className="text-cinema-red hover:underline">
                privacy@cinamini.app
              </a>
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}