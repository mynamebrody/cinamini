"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"

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
          Signing up...
        </>
      ) : (
        "Sign Up"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  // Initialize with null as the initial state
  const [state, formAction] = useActionState(signUp, null)

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-nyt text-4xl font-bold tracking-tight text-neutral-900">Create an account</h1>
        <p className="text-lg text-neutral-600">Sign up to get started</p>
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
              className="bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-500"
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
              className="bg-white border-neutral-300 text-neutral-900"
            />
          </div>
        </div>

        <SubmitButton />

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
