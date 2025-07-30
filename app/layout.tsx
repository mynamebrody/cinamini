import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CinaMini - Daily Movie Puzzles",
  description: "Daily movie puzzle games for cinema enthusiasts. Test your film knowledge with Retitled, Budget Bracket, and more!",
  generator: 'CinaMini',
  keywords: "movie games, daily puzzles, film trivia, cinema games, movie challenges",
  authors: [{ name: "CinaMini Team" }],
}

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
    <html lang="en">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}
