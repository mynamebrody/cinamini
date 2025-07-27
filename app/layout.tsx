import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { CinaMiniThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CinaMini - Daily Movie Puzzles",
  description: "Daily movie puzzle games inspired by Wordle. Test your film knowledge with Retitled, Budget Bracket, and more!",
  generator: 'CinaMini',
  keywords: "movie games, daily puzzles, film trivia, wordle for movies, cinema games",
  authors: [{ name: "CinaMini Team" }],
  viewport: "width=device-width, initial-scale=1, user-scalable=no",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className}>
        <CinaMiniThemeProvider
          defaultTheme="system"
          defaultContrast="normal"
          storageKey="cinamini-theme"
        >
          {children}
        </CinaMiniThemeProvider>
      </body>
    </html>
  )
}
