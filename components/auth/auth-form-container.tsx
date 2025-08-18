"use client"

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import SocialAuthButton from './social-auth-button'
import useOAuthSignIn from '@/hooks/use-oauth-signin'

type AuthMode = 'login' | 'signup'
type AuthProvider = 'google' | 'apple' | 'email'

interface AuthFormContainerProps {
  mode: AuthMode
  onSocialAuth?: (provider: AuthProvider) => void
  children?: ReactNode
  className?: string
}

export default function AuthFormContainer({
  mode,
  onSocialAuth,
  children,
  className = ''
}: AuthFormContainerProps) {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const { loading, error, signIn } = useOAuthSignIn()

  const handleSocialAuth = async (provider: AuthProvider) => {
    if (provider === 'email') {
      setShowEmailForm(!showEmailForm)
      return
    }

    // Call the custom callback if provided, otherwise use the built-in signIn
    if (onSocialAuth) {
      onSocialAuth(provider)
    } else {
      await signIn(provider)
    }
  }

  const title = mode === 'login' ? 'Welcome back' : 'Create an account'
  const subtitle = mode === 'login' ? 'Sign in to your account' : 'Sign up to get started'

  return (
    <div className={`w-full max-w-md space-y-8 ${className}`}>
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="font-funnel-display-bold text-4xl font-bold tracking-tight text-neutral-900">
          {title}
        </h1>
        <p className="text-lg text-neutral-600">
          {subtitle}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Social Auth Buttons */}
      <div className="space-y-4">
        {/* Apple Auth - Hidden for now while focusing on Google */}
        {/* <SocialAuthButton
          provider="apple"
          onClick={() => handleSocialAuth('apple')}
          loading={loading}
          disabled={loading}
        /> */}

        {/* Google Auth */}
        <SocialAuthButton
          provider="google"
          onClick={() => handleSocialAuth('google')}
          loading={loading}
          disabled={loading}
        />

        {/* Email/Password Toggle Button */}
        <SocialAuthButton
          provider="email"
          onClick={() => handleSocialAuth('email')}
          loading={false}
          disabled={loading}
          className={showEmailForm ? 'bg-cinema-gold text-neutral-900 border-cinema-gold hover:bg-cinema-gold/90' : ''}
        />
      </div>

      {/* Divider */}
      {showEmailForm && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-neutral-500">
              {mode === 'login' ? 'Or sign in with email' : 'Or sign up with email'}
            </span>
          </div>
        </div>
      )}

      {/* Email Form (collapsible) */}
      {showEmailForm && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Collapse Button */}
          <button
            type="button"
            onClick={() => setShowEmailForm(false)}
            className="flex items-center justify-center w-full text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="Hide email form"
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            Hide email form
          </button>
          
          {/* Form Content */}
          <div className="border-t border-neutral-200 pt-6">
            {children}
          </div>
        </div>
      )}

      {/* Show Email Form Button (when collapsed) */}
      {!showEmailForm && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="flex items-center justify-center w-full text-sm text-neutral-500 hover:text-neutral-700 transition-colors py-2"
            disabled={loading}
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            {mode === 'login' ? 'Sign in with email instead' : 'Sign up with email instead'}
          </button>
        </div>
      )}
    </div>
  )
}