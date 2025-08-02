import type React from "react"
import type { Viewport } from "next"
import { Geist } from "next/font/google"
import { constructMetadata } from "@/lib/metadata"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
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
    <html lang="en">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}
