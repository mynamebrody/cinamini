"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { signIn } from "@/lib/actions"
import { processAuthHash, hasAuthHash } from "@/lib/auth-hash-handler"

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
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
  const [state, formAction] = useActionState(signIn, null)
  const [authProcessing, setAuthProcessing] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  // Debug: Log redirect URL on mount
  useEffect(() => {
    console.log('LoginForm mounted with redirect:', redirectUrl)
  }, [redirectUrl])

  // Debug: Log state changes
  useEffect(() => {
    console.log('Login state changed:', state)
  }, [state])

  // Handle successful login by redirecting
  useEffect(() => {
    if (state?.success) {
      console.log('Login successful, redirecting to:', redirectUrl || "/")
      const targetUrl = redirectUrl || "/"
      // Small delay to ensure state is committed
      setTimeout(() => {
        console.log('Executing redirect to:', targetUrl)
        window.location.href = targetUrl
      }, 100)
    }
  }, [state, redirectUrl])

  // Handle authentication from hash fragments (email confirmation links)
  useEffect(() => {
    const handleAuthHash = async () => {
      if (hasAuthHash()) {
        setAuthProcessing(true)
        setAuthMessage("Processing email confirmation...")
        
        try {
          const result = await processAuthHash()
          
          if (result.success) {
            setAuthMessage("Email confirmed successfully! Redirecting to your profile...")
            // Redirect to profile after successful email confirmation
            setTimeout(() => {
              router.push("/profile?emailConfirmed=true")
            }, 1500)
          } else {
            setAuthMessage(`Error: ${result.error}`)
            setAuthProcessing(false)
          }
        } catch (error) {
          console.error("Error processing auth hash:", error)
          setAuthMessage("Error processing email confirmation")
          setAuthProcessing(false)
        }
      }
    }

    handleAuthHash()
  }, [router])

  // Show auth processing screen if handling hash authentication
  if (authProcessing) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-funnel-display-bold text-4xl font-bold tracking-tight text-neutral-900">Processing...</h1>
          <p className="text-lg text-neutral-600">Please wait while we confirm your email</p>
        </div>
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cinema-red" />
          {authMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
              {authMessage}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-funnel-display-bold text-4xl font-bold tracking-tight text-neutral-900">Welcome back</h1>
        <p className="text-lg text-neutral-600">Sign in to your account</p>
      </div>

      {authMessage && !authProcessing && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {authMessage}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{state.error}</div>
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
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-cinema-red hover:text-cinema-red-dark font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-neutral-600">
          Don&apos;t have an account?{" "}
          <Link
            href={redirectUrl ? `/auth/sign-up?redirect=${encodeURIComponent(redirectUrl)}` : "/auth/sign-up"}
            className="text-cinema-red hover:text-cinema-red-dark font-medium hover:underline"
          >
            Sign up
          </Link>
        </div>
      </form>
    </div>
  )
}
