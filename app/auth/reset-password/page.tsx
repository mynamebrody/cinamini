import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import ResetPasswordForm from "@/components/reset-password-form"

export default async function ResetPasswordPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold mb-4 text-neutral-900">Connect Supabase to get started</h1>
        <p className="text-neutral-600">Please set up your Supabase environment variables to enable authentication.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, the user hasn't clicked the reset link or it expired
  if (!session) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-50">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="font-nyt text-3xl font-bold tracking-tight text-neutral-900">Invalid or expired link</h1>
          <p className="text-lg text-neutral-600">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <a href="/auth/forgot-password" className="inline-block text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Request new reset link
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-50">
      <ResetPasswordForm />
    </div>
  )
}