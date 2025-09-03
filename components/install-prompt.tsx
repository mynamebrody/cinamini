'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [showIOSInstall, setShowIOSInstall] = useState(false)
  const [showAndroidInstall, setShowAndroidInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error)
      })
    }

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

    if (isIOS && !isInStandaloneMode) {
      // Show iOS install instructions after a delay
      setTimeout(() => {
        setShowIOSInstall(true)
      }, 3000)
    }

    // Handle PWA install prompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowAndroidInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app is installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
      setShowAndroidInstall(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowAndroidInstall(false)
  }

  const handleDismiss = () => {
    setShowIOSInstall(false)
    setShowAndroidInstall(false)
  }

  if (!showIOSInstall && !showAndroidInstall) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up sm:max-w-md sm:left-auto sm:right-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 pr-12 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        {showIOSInstall && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/app-icons/android/mipmap-hdpi/ic_launcher.png"
                alt="Cinamini"
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Add Cinamini to Home Screen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Install the app for the best experience</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p className="flex items-center gap-2">
                1. Tap the 
                <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V3m0 0L8 7m4-4l4 4" />
                </svg>
                Share button below
              </p>
              <p>2. Scroll and tap "Add to Home Screen"</p>
              <p>3. Tap "Add" to confirm</p>
            </div>
          </div>
        )}

        {showAndroidInstall && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/app-icons/android/mipmap-hdpi/ic_launcher.png"
                alt="Cinamini"
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Install Cinamini</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Add to your home screen for quick access</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}