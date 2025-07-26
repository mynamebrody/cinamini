import { headers } from 'next/headers'

/**
 * Server component that injects CSRF token into the page for client-side use
 */
export async function SecurityProvider({ children }: { children: React.ReactNode }) {
  // Get CSRF token from response headers (set by middleware)
  const headersList = await headers()
  const csrfToken = headersList.get('x-csrf-token')
  
  return (
    <>
      {csrfToken && (
        <meta name="csrf-token" content={csrfToken} />
      )}
      {children}
    </>
  )
}