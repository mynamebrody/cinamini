'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  return isIOS && isSafari
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  // iOS: window.navigator.standalone; Others: matchMedia
  // @ts-ignore: standlone exists on iOS Safari
  const iosStandalone = typeof window.navigator.standalone !== 'undefined' && (window.navigator as any).standalone
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  return Boolean(iosStandalone || displayModeStandalone)
}

export default function PwaInstallPrompt() {
  const deferredPromptRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode()) return

    const onBeforeInstall = (e: any) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setReady(true)

      // Show toast prompting install on Android/Chrome
      if (!isIosSafari()) {
        const t = toast({
          title: 'Install app',
          description: 'Get the best experience: install cinamini to your home screen.',
          action: (
            <button
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-secondary"
              onClick={async () => {
                try {
                  const dp = deferredPromptRef.current
                  if (!dp) return
                  deferredPromptRef.current = null
                  setReady(false)
                  await dp.prompt()
                  const choice = await dp.userChoice
                  if (choice?.outcome === 'accepted') {
                    // accepted
                  }
                } catch {}
              }}
            >
              Install
            </button>
          ),
        })

        // Keep toast visible for a long time; library uses long timeout already.
        return () => t.dismiss()
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall as any)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall as any)
  }, [])

  useEffect(() => {
    if (ready) return
    if (isInStandaloneMode()) return
    // Show iOS hint if applicable
    if (isIosSafari()) {
      const dismiss = toast({
        title: 'Add to Home Screen',
        description: 'Tap the Share button and choose "Add to Home Screen".',
      })
      return () => dismiss.dismiss()
    }
  }, [ready])

  return null
}

