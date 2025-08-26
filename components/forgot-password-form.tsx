"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { resetPasswordForEmail } from "@/lib/actions"

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
          Sending reset link...
        </>
      ) : (
        "Send Reset Link"
      )}
    </Button>
  )
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordForEmail, null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Show success message if email was sent
  if (state?.success || showSuccess) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="font-nyt text-3xl font-bold tracking-tight text-neutral-900">Check your email</h1>
          <p className="text-lg text-neutral-600">
            If an account exists with that email, we&apos;ve sent a password reset link.
          </p>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm text-neutral-500">
            Didn&apos;t receive an email? Check your spam folder or try again.
          </p>
          <Button
            onClick={() => {
              setShowSuccess(false)
              // Reset the form state by triggering a re-render
              window.location.reload()
            }}
            variant="outline"
            className="w-full"
          >
            Try again
          </Button>
          <Link href="/auth/login" className="block text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-nyt text-4xl font-bold tracking-tight text-neutral-900">Reset your password</h1>
        <p className="text-lg text-neutral-600">Enter your email and we&apos;ll send you a reset link</p>
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{state.error}</div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="bg-white border-[rgb(var(--silver))] text-neutral-900 placeholder:text-neutral-500"
          />
        </div>

        <SubmitButton />

        <div className="text-center text-neutral-600">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}