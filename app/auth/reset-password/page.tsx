import { isSupabaseConfigured } from "@/lib/supabase/server"
import ResetPasswordForm from "@/components/reset-password-form"

export default async function ResetPasswordPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-50">
        <div className="mx-auto max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4 text-neutral-900">Connect Supabase to get started</h1>
          <p className="text-neutral-600">Please set up your Supabase environment variables to enable authentication.</p>
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