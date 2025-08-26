"use client"

import { Button } from "@/components/ui/button"
import { LogOut, User, Trophy } from "lucide-react"
import { signOut } from "@/lib/actions"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"

interface SiteHeaderProps {
  user: any
  displayName: string | null
}

export function SiteHeader({ user, displayName }: SiteHeaderProps) {
  const [streakCount, setStreakCount] = useState(0)

  useEffect(() => {
    const fetchStreakCount = async () => {
      if (!user) {
        setStreakCount(0)
        return
      }
      
      try {
        // Fetch streak from database for all users (anonymous and authenticated)
        const response = await fetch('/api/user/streak')
        if (response.ok) {
          const data = await response.json()
          setStreakCount(data.streak || 0)
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error)
        setStreakCount(0)
      }
    }
    
    fetchStreakCount()
  }, [user])

  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/cinamini/Wordmark.webp"
                alt="cinamini"
                width={140}
                height={40}
                className="h-10 w-auto"
                priority
              />
              {/* Fallback text logo if needed */}
              {/* <span className="text-2xl font-funnel-display-bold text-cinema-red font-bold">cinamini</span> */}
            </Link>
            <span className="ml-3 text-sm text-neutral-500 hidden sm:block font-funnel">
              Daily Movie Puzzles
            </span>
          </div>

          {/* Navigation items */}
          <div className="flex items-center space-x-4">
            {/* Show streak for all users when > 0 */}
            {streakCount > 0 && (
              <div className="flex items-center text-sm text-neutral-600">
                <Trophy className="h-4 w-4 mr-1 text-orange-500" />
                <span className="font-medium">{streakCount}</span>
                <span className="hidden sm:inline ml-1">day streak</span>
              </div>
            )}
            
            {user && !user.is_anonymous ? (
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