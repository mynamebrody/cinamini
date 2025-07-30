'use client'

import * as React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isHydrated: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'cinamini-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved theme preference on mount
  useEffect(() => {
    setIsHydrated(true)
    
    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme
      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        setThemeState(savedTheme)
      }
    } catch {
      // Fallback to default if localStorage fails
      console.warn('Failed to load theme from localStorage, using default')
    }
  }, [storageKey])

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    
    // Apply current theme
    root.classList.add(theme)
    
    // Also update body for immediate visual feedback
    document.body.className = document.body.className.replace(/\b(light|dark)\b/g, '').trim() + ` ${theme}`
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch {
      console.warn('Failed to save theme to localStorage')
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isHydrated,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}