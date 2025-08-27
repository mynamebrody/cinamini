import { isSupabaseConfigured } from "@/lib/supabase/server"
import ResetPasswordForm from "@/components/reset-password-form"

export default async function ResetPasswordPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="mx-auto max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
          <p className="text-muted-foreground">Please set up your Supabase environment variables to enable authentication.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <ResetPasswordForm />
    </div>
  )
}