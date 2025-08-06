"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { processAuthHash, hasAuthHash } from "@/lib/auth-hash-handler"

interface AuthHashProcessorProps {
  redirectPath?: string
  successMessage?: string
  processingMessage?: string
}

export default function AuthHashProcessor({ 
  redirectPath = "/profile",
  successMessage = "Authentication successful! Redirecting...",
  processingMessage = "Processing authentication..."
}: AuthHashProcessorProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthHash = async () => {
      if (hasAuthHash()) {
        setIsProcessing(true)
        setMessage(processingMessage)
        
        try {
          const result = await processAuthHash()
          
          if (result.success) {
            setMessage(successMessage)
            
            // Determine redirect path based on auth type
            let finalRedirectPath = redirectPath
            if (result.type === 'invite') {
              finalRedirectPath = "/profile?invited=true"
            } else if (result.type === 'signup') {
              finalRedirectPath = "/profile?emailConfirmed=true"
            }
            
            // Redirect after a short delay
            setTimeout(() => {
              router.push(finalRedirectPath)
            }, 1500)
          } else {
            setError(result.error || "Authentication failed")
            setIsProcessing(false)
          }
        } catch (error) {
          console.error("Error processing auth hash:", error)
          setError("Error processing authentication")
          setIsProcessing(false)
        }
      }
    }

    handleAuthHash()
  }, [router, redirectPath, successMessage, processingMessage])

  // Don't render anything if not processing auth
  if (!isProcessing && !error) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center space-y-4 shadow-lg border border-gray-100">
        {isProcessing && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cinema-red" />
            <h2 className="text-xl font-semibold text-neutral-900">Processing...</h2>
            {message && (
              <p className="text-neutral-600">{message}</p>
            )}
          </>
        )}
        
        {error && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cinema-red">Authentication Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setIsProcessing(false)
                // Clean up URL hash and redirect to login
                window.history.replaceState(null, '', window.location.pathname)
                router.push('/auth/login')
              }}
              className="px-4 py-2 bg-cinema-red text-white rounded hover:bg-cinema-red-dark transition-colors"
            >
              Continue to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}