"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Settings, User } from "lucide-react"
import { signOut } from "@/lib/actions"

interface SiteHeaderProps {
  user: any
  displayName: string | null
}

export function SiteHeader({ user, displayName }: SiteHeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <h1 className="font-nyt text-2xl font-bold text-neutral-900">
              CinaMini
            </h1>
            <span className="ml-3 text-sm text-neutral-500 hidden sm:block">
              Daily Movie Puzzles
            </span>
          </div>

          {/* Navigation items */}
          <div className="flex items-center space-x-4">
            
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href="/profile" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{displayName}</span>
                  </a>
                </Button>
                <form action={signOut}>
                  <Button type="submit" variant="outline" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href="/auth/login">Sign In</a>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <a href="/auth/sign-up">Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}