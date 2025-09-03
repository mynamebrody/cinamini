'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Cookies from 'js-cookie'
import { toast } from '@/hooks/use-toast'

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || 
    // iPad on iOS 13+ detection
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  return isIOS && isSafari
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  // iOS: window.navigator.standalone; Others: matchMedia
  // @ts-expect-error: standalone exists on iOS Safari
  const iosStandalone = typeof window.navigator.standalone !== 'undefined' && (window.navigator as any).standalone
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  return Boolean(iosStandalone || displayModeStandalone)
}

function isPwaInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  
  // Check if running in standalone mode (already installed)
  if (isInStandaloneMode()) {
    return Promise.resolve(true)
  }
  
  // iOS-specific: Check if user has previously added to home screen
  // We'll track this via cookie when they interact with the share sheet
  const ADDED_TO_HOME_SCREEN_KEY = 'cinamini_added_to_home_screen'
  if (isIosSafari() && Cookies.get(ADDED_TO_HOME_SCREEN_KEY) === 'true') {
    return Promise.resolve(true)
  }
  
  // Check using getInstalledRelatedApps API (Chrome/Edge)
  if ('getInstalledRelatedApps' in navigator) {
    return (navigator as any).getInstalledRelatedApps()
      .then((relatedApps: any[]) => relatedApps.length > 0)
      .catch(() => false)
  }
  
  return Promise.resolve(false)
}

export default function PwaInstallPrompt() {
  const deferredPromptRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const toastRef = useRef<any>(null)

  const COOKIE_KEY = 'cinamini_pwa_install_dismissed'
  const ADDED_TO_HOME_SCREEN_KEY = 'cinamini_added_to_home_screen'
  const COOKIE_EXPIRY = 90 // days

  const dismissToast = useCallback((decision: 'installed' | 'dismissed') => {
    // Store user's decision in cookie
    Cookies.set(COOKIE_KEY, decision, { expires: COOKIE_EXPIRY })
    
    // Dismiss the toast using the toast's dismiss method
    if (toastRef.current) {
      toastRef.current.dismiss()
      toastRef.current = null
    }
  }, [COOKIE_KEY, COOKIE_EXPIRY])

  // iOS-specific: Detect when user returns from share sheet
  const setupIosDetection = useCallback(() => {
    if (!isIosSafari()) return

    let shareSheetOpened = false
    const startTime = Date.now()

    // Track when page becomes hidden (share sheet opens)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        shareSheetOpened = true
        console.log('PWA Install Prompt: iOS page hidden (share sheet likely opened)')
      } else if (shareSheetOpened) {
        // Page became visible again after being hidden
        const timeDiff = Date.now() - startTime
        console.log('PWA Install Prompt: iOS page visible again after', timeDiff, 'ms')
        
        // If they were away for more than 2 seconds, they likely interacted with share sheet
        if (timeDiff > 2000) {
          console.log('PWA Install Prompt: Assuming iOS app was added to home screen')
          Cookies.set(ADDED_TO_HOME_SCREEN_KEY, 'true', { expires: COOKIE_EXPIRY })
          
          // Dismiss the toast if it's showing
          if (toastRef.current) {
            toastRef.current.dismiss()
            toastRef.current = null
          }
        }
        shareSheetOpened = false
      }
    }

    // Also listen for focus events as backup
    const handleFocus = () => {
      if (shareSheetOpened) {
        setTimeout(() => {
          console.log('PWA Install Prompt: iOS window refocused, checking if app was added')
          // Small delay to let any potential installation complete
          if (isInStandaloneMode()) {
            Cookies.set(ADDED_TO_HOME_SCREEN_KEY, 'true', { expires: COOKIE_EXPIRY })
          }
        }, 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [ADDED_TO_HOME_SCREEN_KEY, COOKIE_EXPIRY])

  const initializePwaPrompt = useCallback(() => {
    const onBeforeInstall = (e: any) => {
      console.log('PWA Install Prompt: beforeinstallprompt event fired')
      e.preventDefault()
      deferredPromptRef.current = e
      setReady(true)

      // Show toast prompting install on Android/Chrome
      if (!isIosSafari()) {
        console.log('PWA Install Prompt: Showing Android/Chrome install toast')
        const t = toast({
          duration: Infinity, // Never auto-dismiss
          title: (
            <div className="flex flex-col items-center text-center space-y-3">
              <Image 
                src="/app-icons/pwa-192.png" 
                alt="cinamini app icon" 
                width={64}
                height={64}
                className="rounded-2xl shadow-lg"
              />
              <div>
                <div className="font-semibold text-base">Install cinamini</div>
                <div className="text-sm text-gray-600 mt-1">Get the best experience on your home screen</div>
              </div>
            </div>
          ),
          action: (
            <div className="flex flex-col space-y-2 w-full">
              <button
                className="w-full h-10 flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                onClick={async () => {
                  try {
                    const dp = deferredPromptRef.current
                    if (!dp) return
                    deferredPromptRef.current = null
                    setReady(false)
                    await dp.prompt()
                    const choice = await dp.userChoice
                    if (choice?.outcome === 'accepted') {
                      dismissToast('installed')
                    } else {
                      dismissToast('dismissed')
                    }
                  } catch {
                    dismissToast('dismissed')
                  }
                }}
              >
                Install
              </button>
              <button
                className="w-full h-10 flex items-center justify-center rounded-md px-4 text-sm font-medium text-gray-500 hover:text-gray-700 active:text-gray-800 transition-colors touch-manipulation"
                onClick={() => dismissToast('dismissed')}
              >
                Not now
              </button>
            </div>
          ),
        })

        toastRef.current = t
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall as any)
    console.log('PWA Install Prompt: Added beforeinstallprompt listener')
    
    // Fallback: Show iOS prompt immediately if no beforeinstallprompt after 2 seconds
    setTimeout(() => {
      if (!ready && isIosSafari()) {
        console.log('PWA Install Prompt: Fallback - showing iOS prompt after 2s delay')
        const t = toast({
          duration: Infinity,
          title: (
            <div className="flex flex-col items-center text-center space-y-3">
              <Image 
                src="/app-icons/pwa-192.png" 
                alt="cinamini app icon" 
                width={64}
                height={64}
                className="rounded-2xl shadow-lg"
              />
              <div>
                <div className="font-semibold text-base">Add to Home Screen</div>
                <div className="text-sm text-gray-600 mt-1">Tap the Share button and choose &ldquo;Add to Home Screen&rdquo;</div>
              </div>
            </div>
          ),
          action: (
            <div className="flex flex-col space-y-2 w-full">
              <button
                className="w-full h-10 flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                onClick={() => {
                  console.log('PWA Install Prompt: iOS user clicked "I added it"')
                  Cookies.set(ADDED_TO_HOME_SCREEN_KEY, 'true', { expires: COOKIE_EXPIRY })
                  dismissToast('installed')
                }}
              >
                I added it
              </button>
              <button
                className="w-full h-10 flex items-center justify-center rounded-md px-4 text-sm font-medium text-gray-500 hover:text-gray-700 active:text-gray-800 transition-colors touch-manipulation"
                onClick={() => dismissToast('dismissed')}
              >
                Not now
              </button>
            </div>
          ),
        })
        toastRef.current = t
      }
    }, 2000)
  }, [ready, ADDED_TO_HOME_SCREEN_KEY, COOKIE_EXPIRY, dismissToast])

  useEffect(() => {
    console.log('PWA Install Prompt: Checking conditions...')
    console.log('Is standalone mode:', isInStandaloneMode())
    console.log('Is iOS Safari:', isIosSafari())
    console.log('User agent:', navigator.userAgent)
    
    // Check if PWA is already installed
    isPwaInstalled().then(installed => {
      console.log('PWA Install Prompt: Is PWA installed:', installed)
      if (installed) {
        console.log('PWA Install Prompt: PWA already installed, not showing')
        return
      }
      
      // Check if user has already made a decision
      const userDecision = Cookies.get(COOKIE_KEY)
      console.log('User decision cookie:', userDecision)
      if (userDecision) {
        console.log('PWA Install Prompt: User already made decision, not showing')
        return
      }
      
      // Continue with the rest of the logic...
      initializePwaPrompt()
      
      // Set up iOS-specific detection
      const cleanupIosDetection = setupIosDetection()
      
      return cleanupIosDetection
    })
  }, [initializePwaPrompt, setupIosDetection, COOKIE_KEY])
  
  // Add cleanup for event listeners
  useEffect(() => {
    return () => {
      if (toastRef.current) {
        toastRef.current.dismiss()
      }
    }
  }, [])



  return null
}

