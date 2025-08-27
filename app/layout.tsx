import type React from "react"
import type { Viewport } from "next"
import { Funnel_Display, Funnel_Sans } from "next/font/google"
import { constructMetadata } from "@/lib/metadata"
import GoogleAnalytics from "@/components/google-analytics"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

// Load Funnel Display Bold for headings
const funnelDisplayBold = Funnel_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-funnel-display-bold',
  display: 'swap',
})

// Load Funnel Sans Light for body text
const funnelSansLight = Funnel_Sans({
  subsets: ['latin'],
  weight: ['300'],
  variable: '--font-funnel-sans-light',
  display: 'swap',
})

export const metadata = constructMetadata()

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${funnelDisplayBold.variable} ${funnelSansLight.variable}`}>
      <body className={funnelSansLight.className}>
        <GoogleAnalytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          suppressHydrationWarning
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
