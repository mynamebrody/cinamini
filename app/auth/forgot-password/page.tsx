import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import ForgotPasswordForm from "@/components/forgot-password-form"

export default async function ForgotPasswordPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="mx-auto max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4 text-neutral-900">Connect Supabase to get started</h1>
          <p className="text-neutral-600">Please set up your Supabase environment variables to enable authentication.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If already logged in, redirect to home
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="mx-auto max-w-md p-6 text-center">
          <p className="text-neutral-600">You are already logged in.</p>
          <a href="/" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Go to home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <ForgotPasswordForm />
    </div>
  )
}