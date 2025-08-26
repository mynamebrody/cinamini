"use client"

import { useActionState, useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { updatePassword } from "@/lib/actions"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="lg"
      className="w-full h-12"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating password...
        </>
      ) : (
        "Update Password"
      )}
    </Button>
  )
}

export default function ResetPasswordForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(updatePassword, null)
  const [showSuccess] = useState(false)
  const [isValidRecovery, setIsValidRecovery] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Check if user has a valid recovery session
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    const checkRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // Check if there's a valid session (user will be authenticated after clicking the reset link)
        if (session?.user) {
          setIsValidRecovery(true)
        }
      } catch (error) {
        console.error("Error checking recovery session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsValidRecovery(true)
        setIsLoading(false)
      }
    })

    checkRecoverySession()

    return () => subscription.unsubscribe()
  }, [supabase])

  // Handle redirect on success with proper cleanup
  useEffect(() => {
    if (state?.success || showSuccess) {
      const timeoutId = setTimeout(() => {
        router.push("/auth/login")
      }, 3000)

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId)
    }
  }, [state?.success, showSuccess, router])

  // Show loading state while checking recovery session
  if (isLoading) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cinema-red" />
          <p className="text-lg text-neutral-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Show error if not a valid password recovery session
  if (!isValidRecovery) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-nyt text-3xl font-bold tracking-tight text-neutral-900">Invalid or expired link</h1>
          <p className="text-lg text-neutral-600">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>
        <div className="text-center">
          <Link href="/auth/forgot-password" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Request new reset link
          </Link>
        </div>
      </div>
    )
  }

  // Show success message if password was updated
  if (state?.success || showSuccess) {

    return (
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="font-nyt text-3xl font-bold tracking-tight text-neutral-900">Password updated!</h1>
          <p className="text-lg text-neutral-600">
            Your password has been successfully updated. Signing you in now...
          </p>
        </div>

        <div className="text-center">
          <Link href="/auth/login" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Go play some games now!
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-nyt text-4xl font-bold tracking-tight text-neutral-900">Create new password</h1>
        <p className="text-lg text-neutral-600">Enter your new password below</p>
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{state.error}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              New Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="bg-white border-[rgb(var(--silver))] text-neutral-900"
              placeholder="At least 6 characters"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="bg-white border-[rgb(var(--silver))] text-neutral-900"
              placeholder="Enter password again"
            />
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-neutral-600">
          <Link href="/auth/login" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  )
}