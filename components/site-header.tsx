"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Settings, User, Trophy } from "lucide-react"
import { signOut } from "@/lib/actions"
import { useState, useEffect } from "react"
import { localGameStorage } from "@/lib/local-game-storage"
import Image from "next/image"

interface SiteHeaderProps {
  user: any
  displayName: string | null
}

export function SiteHeader({ user, displayName }: SiteHeaderProps) {
  const [streakCount, setStreakCount] = useState(0)

  useEffect(() => {
    if (!user) {
      // Show streak count for anonymous users as a nudge
      const stats = localGameStorage.getStats()
      setStreakCount(stats.streakData.current)
    }
  }, [user])

  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <Image
                src="/cinamini/Wordmark.webp"
                alt="CinaMini"
                width={140}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </a>
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
                {streakCount > 0 && (
                  <div className="flex items-center text-sm text-neutral-600">
                    <Trophy className="h-4 w-4 mr-1 text-orange-500" />
                    <span className="font-medium">{streakCount}</span>
                    <span className="hidden sm:inline ml-1">day streak</span>
                  </div>
                )}
                <Button asChild variant="ghost" size="sm">
                  <a href="/auth/login">Sign In</a>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <a href="/auth/sign-up">
                    <span className="hidden sm:inline">Save Progress</span>
                    <span className="sm:hidden">Sign Up</span>
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}