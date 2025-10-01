'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Cookies from 'js-cookie'
import { toast } from '@/hooks/use-toast'

// Debug + timing constants
const DEBUG_PWA_PROMPT = process.env.NODE_ENV !== 'production'
const IOS_INSTALL_MIN_HIDE_MS = 2000
const IOS_FOCUS_CHECK_DELAY_MS = 1000
const IOS_HANDLED_COOLDOWN_MS = 3000
const IOS_FALLBACK_PROMPT_DELAY_MS = 2000

const debugLog = (...args: any[]) => {
  if (DEBUG_PWA_PROMPT) {
    // Prefix for easier filtering
     
    console.log('PWA Install Prompt:', ...args)
  }
}

const PROD_COOKIE_OPTIONS = process.env.NODE_ENV === 'production' 
  ? ({ secure: true, sameSite: 'lax' as const })
  : ({} as Record<string, any>)

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
  const beforeInstallHandlerRef = useRef<((e: any) => void) | null>(null)
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // iOS detection state (refs protect against re-renders and race conditions)
  const iosShareOpenedRef = useRef(false)
  const iosHiddenStartRef = useRef<number | null>(null)
  const iosLastHandledAtRef = useRef<number>(0)
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const COOKIE_KEY = 'cinamini_pwa_install_dismissed'
  const ADDED_TO_HOME_SCREEN_KEY = 'cinamini_added_to_home_screen'
  const COOKIE_EXPIRY = 90 // days

  const dismissToast = useCallback((decision: 'installed' | 'dismissed') => {
    // Store user's decision in cookie
    Cookies.set(COOKIE_KEY, decision, { expires: COOKIE_EXPIRY, ...PROD_COOKIE_OPTIONS })
    
    // Dismiss the toast using the toast's dismiss method
    if (toastRef.current) {
      toastRef.current.dismiss()
      toastRef.current = null
    }
  }, [COOKIE_KEY, COOKIE_EXPIRY])

  // iOS-specific: Detect when user returns from share sheet
  const setupIosDetection = useCallback(() => {
    if (!isIosSafari()) return

    // Track when page becomes hidden (share sheet likely opens)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        iosShareOpenedRef.current = true
        iosHiddenStartRef.current = Date.now()
        debugLog('iOS page hidden (share sheet likely opened)')
      } else if (iosShareOpenedRef.current) {
        const hiddenStart = iosHiddenStartRef.current ?? Date.now()
        const timeDiff = Date.now() - hiddenStart
        debugLog('iOS page visible again after', timeDiff, 'ms')

        // Throttle repeated handling to avoid rapid hide/show cycles
        const now = Date.now()
        if (now - iosLastHandledAtRef.current < IOS_HANDLED_COOLDOWN_MS) {
          iosShareOpenedRef.current = false
          return
        }

        // If away long enough, assume interaction with share sheet occurred
        if (timeDiff >= IOS_INSTALL_MIN_HIDE_MS) {
          debugLog('Assuming iOS app was added to home screen')
          Cookies.set(ADDED_TO_HOME_SCREEN_KEY, 'true', { expires: COOKIE_EXPIRY, ...PROD_COOKIE_OPTIONS })
          iosLastHandledAtRef.current = now

          // Dismiss the toast if it's showing
          if (toastRef.current) {
            toastRef.current.dismiss()
            toastRef.current = null
          }
        }
        iosShareOpenedRef.current = false
        iosHiddenStartRef.current = null
      }
    }

    // Also listen for focus events as backup
    const handleFocus = () => {
      if (!iosShareOpenedRef.current) return
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current)
      }
      focusTimeoutRef.current = setTimeout(() => {
        debugLog('iOS window refocused, checking if app was added')
        // Small delay to let any potential installation complete
        if (isInStandaloneMode()) {
          Cookies.set(ADDED_TO_HOME_SCREEN_KEY, 'true', { expires: COOKIE_EXPIRY, ...PROD_COOKIE_OPTIONS })
        }
      }, IOS_FOCUS_CHECK_DELAY_MS)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current)
        focusTimeoutRef.current = null
      }
    }
  }, [ADDED_TO_HOME_SCREEN_KEY, COOKIE_EXPIRY])

  const initializePwaPrompt = useCallback(() => {
    const onBeforeInstall = (e: any) => {
      debugLog('beforeinstallprompt event fired')
      e.preventDefault()
      deferredPromptRef.current = e
      setReady(true)

      // Show toast prompting install on Android/Chrome
      if (!isIosSafari()) {
        debugLog('Showing Android/Chrome install toast')
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
    beforeInstallHandlerRef.current = onBeforeInstall
    debugLog('Added beforeinstallprompt listener')

    // Fallback: Show iOS prompt after a short delay (iOS doesn't fire beforeinstallprompt)
    if (isIosSafari()) {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
      }
      fallbackTimeoutRef.current = setTimeout(() => {
        debugLog('Fallback - showing iOS prompt after delay')
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
                  debugLog('iOS user clicked "I added it"')
                  Cookies.set(ADDED_TO_HOME_SCREEN_KEY, 'true', { expires: COOKIE_EXPIRY, ...PROD_COOKIE_OPTIONS })
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
      }, IOS_FALLBACK_PROMPT_DELAY_MS)
    }

    return () => {
      if (beforeInstallHandlerRef.current) {
        window.removeEventListener('beforeinstallprompt', beforeInstallHandlerRef.current as any)
        beforeInstallHandlerRef.current = null
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }
  }, [ADDED_TO_HOME_SCREEN_KEY, COOKIE_EXPIRY, dismissToast])

  useEffect(() => {
    debugLog('Checking conditions...')
    debugLog('Is standalone mode:', isInStandaloneMode())
    debugLog('Is iOS Safari:', isIosSafari())
    if (typeof navigator !== 'undefined') {
      debugLog('User agent:', navigator.userAgent)
    }

    let didUnmount = false
    let initCleanup: (() => void) | void
    let iosCleanup: (() => void) | void

    const run = async () => {
      const installed = await isPwaInstalled()
      if (didUnmount) return
      debugLog('Is PWA installed:', installed)
      if (installed) {
        debugLog('PWA already installed, not showing')
        return
      }

      const userDecision = Cookies.get(COOKIE_KEY)
      debugLog('User decision cookie:', userDecision)
      if (userDecision) {
        debugLog('User already made decision, not showing')
        return
      }

      // Continue with the rest of the logic...
      initCleanup = initializePwaPrompt()
      iosCleanup = setupIosDetection()
    }

    run()

    return () => {
      didUnmount = true
      if (iosCleanup) iosCleanup()
      if (initCleanup) initCleanup()
      if (toastRef.current) {
        toastRef.current.dismiss()
      }
    }
  }, [initializePwaPrompt, setupIosDetection, COOKIE_KEY])



  return null
}

