import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161616] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-white">Authentication Error</h1>
          <p className="text-lg text-gray-400">
            Sorry, we couldn't sign you in. There was an issue with the authentication process.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            This might happen if the authentication link has expired or been used already.
          </p>
          
          <Link
            href="/auth/login"
            className="inline-flex w-full justify-center rounded-lg bg-[#2b725e] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#235e4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b725e]"
          >
            Try signing in again
          </Link>
        </div>
      </div>
    </div>
  )
}