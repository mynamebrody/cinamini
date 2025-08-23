"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"

function SubmitButton({ isAnonymous }: { isAnonymous: boolean }) {
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
          {isAnonymous ? "Upgrading..." : "Signing up..."}
        </>
      ) : (
        isAnonymous ? "Upgrade Account" : "Sign Up"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  // Initialize with null as the initial state
  const [state, formAction] = useActionState(signUp, null)
  const [isAnonymous, setIsAnonymous] = useState(false)

  useEffect(() => {
    const checkAnonymousStatus = async () => {
      const supabase = createClient()
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.is_anonymous) {
        setIsAnonymous(true)
      }
    }

    checkAnonymousStatus()
  }, [])

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-funnel-display-bold text-4xl font-bold tracking-tight text-neutral-900">
          {isAnonymous ? "Upgrade your account" : "Create an account"}
        </h1>
        <p className="text-lg text-neutral-600">
          {isAnonymous ? "Save your progress forever" : "Sign up to get started"}
        </p>
        {isAnonymous && (
          <p className="text-sm text-cinema-red bg-red-50 border border-red-200 px-3 py-2 rounded-lg mt-2">
            Your anonymous progress will be preserved when you upgrade to a full account.
          </p>
        )}
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{state.error}</div>
        )}

        {state?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {state.success}
          </div>
        )}

        <div className="space-y-4">
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
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-white border-[rgb(var(--silver))] text-neutral-900"
            />
          </div>
        </div>

        <SubmitButton isAnonymous={isAnonymous} />

        <div className="text-center text-neutral-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
            Log in
          </Link>
        </div>
      </form>
    </div>
  )
}
