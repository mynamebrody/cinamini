import type React from "react"
import type { Viewport } from "next"
import { Funnel_Display, Funnel_Sans } from "next/font/google"
import { constructMetadata } from "@/lib/metadata"
import GoogleAnalytics from "@/components/google-analytics"
import { AuthProvider } from "@/components/auth-provider"
import { Banner } from "@/components/banner"
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
        <AuthProvider>
          {/* Global launch banner; can be toggled by switching show to true/false */}
          <Banner id="discord-launch" show={true}>
            We just launched our&nbsp;
            <a href="https://discord.gg/vjpzKNcfU3" target="_blank" rel="noopener noreferrer" className="underline font-medium">Discord</a>!
            &nbsp;Come let us know how we can improve!&nbsp;
            <a href="https://discord.gg/vjpzKNcfU3" target="_blank" rel="noopener noreferrer" className="underline">Invite</a>
            &nbsp;
            <a href="https://discord.gg/vjpzKNcfU3" target="_blank" rel="noopener noreferrer" aria-label="Discord invite" className="inline-block align-middle">
              <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 16C10.5 18.5 13.5 18.5 18.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.5 17.5L16.5 19.5C16.5 19.5 20.6713 18.1717 22 16C22 15 22.5301 7.85339 19 5.5C17.5 4.5 15 4 15 4L14 6H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.52832 17.5L7.52832 19.5C7.52832 19.5 3.35699 18.1717 2.02832 16C2.02832 15 1.49823 7.85339 5.02832 5.5C6.52832 4.5 9.02832 4 9.02832 4L10.0283 6H12.0283" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 14C7.67157 14 7 13.1046 7 12C7 10.8954 7.67157 10 8.5 10C9.32843 10 10 10.8954 10 12C10 13.1046 9.32843 14 8.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.5 14C14.6716 14 14 13.1046 14 12C14 10.8954 14.6716 10 15.5 10C16.3284 10 17 10.8954 17 12C17 13.1046 16.3284 14 15.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </Banner>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
