'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type Contrast = 'normal' | 'high'

interface CinaMiniThemeContextType {
  theme: Theme
  contrast: Contrast
  setTheme: (theme: Theme) => void
  setContrast: (contrast: Contrast) => void
  resolvedTheme: 'light' | 'dark'
}

const CinaMiniThemeContext = createContext<CinaMiniThemeContextType | undefined>(undefined)

export function useCinaMiniTheme() {
  const context = useContext(CinaMiniThemeContext)
  if (context === undefined) {
    throw new Error('useCinaMiniTheme must be used within a CinaMiniThemeProvider')
  }
  return context
}

interface CinaMiniThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultContrast?: Contrast
  storageKey?: string
}

export function CinaMiniThemeProvider({
  children,
  defaultTheme = 'system',
  defaultContrast = 'normal',
  storageKey = 'cinamini-theme',
  ...props
}: CinaMiniThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [contrast, setContrastState] = useState<Contrast>(defaultContrast)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(`${storageKey}-theme`) as Theme
      const savedContrast = localStorage.getItem(`${storageKey}-contrast`) as Contrast
      
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme)
      }
      
      if (savedContrast && ['normal', 'high'].includes(savedContrast)) {
        setContrastState(savedContrast)
      }
    } catch {
      // Fallback to defaults if localStorage fails
    }
  }, [storageKey])

  // Update resolved theme based on theme and system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
      } else {
        setResolvedTheme(theme as 'light' | 'dark')
      }
    }

    updateResolvedTheme()
    
    if (theme === 'system') {
      mediaQuery.addEventListener('change', updateResolvedTheme)
      return () => mediaQuery.removeEventListener('change', updateResolvedTheme)
    }
  }, [theme])

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'high-contrast')
    
    // Apply current theme
    root.classList.add(resolvedTheme)
    
    // Apply contrast if needed
    if (contrast === 'high') {
      root.classList.add('high-contrast')
    }
  }, [resolvedTheme, contrast])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(`${storageKey}-theme`, newTheme)
    } catch {
      // Fail silently if localStorage is not available
    }
  }

  const setContrast = (newContrast: Contrast) => {
    setContrastState(newContrast)
    try {
      localStorage.setItem(`${storageKey}-contrast`, newContrast)
    } catch {
      // Fail silently if localStorage is not available
    }
  }

  const value = {
    theme,
    contrast,
    setTheme,
    setContrast,
    resolvedTheme,
  }

  return (
    <CinaMiniThemeContext.Provider value={value}>
      <NextThemesProvider 
        attribute="class"
        defaultTheme={defaultTheme}
        enableSystem
        disableTransitionOnChange
        {...props}
      >
        {children}
      </NextThemesProvider>
    </CinaMiniThemeContext.Provider>
  )
}

// Legacy ThemeProvider for compatibility
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <CinaMiniThemeProvider>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </CinaMiniThemeProvider>
  )
}
