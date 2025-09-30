"use client"

import { useEffect, useState } from "react"
import { Film, Save, Repeat, TrendingUp, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ArchivedPuzzleGateProps {
  puzzleNumber: number
  puzzleDate: string
  gameName: string
  gameSlug: string
  isAnonymous: boolean
  isToday: boolean
}

export default function ArchivedPuzzleGate({
  puzzleNumber,
  puzzleDate,
  gameName,
  gameSlug,
  isAnonymous,
  isToday,
}: ArchivedPuzzleGateProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't show gate for today's puzzle or authenticated users
  if (isToday || !isAnonymous || !mounted) {
    return null
  }

  // Format the date for display
  const formattedDate = new Date(puzzleDate + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  })

  // Construct redirect URL to return to this puzzle after auth
  const redirectUrl = `/game/${gameSlug}/${puzzleDate}`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 space-y-6 border-4 border-cinema-red">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-cinema-red/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-cinema-red" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Archived Puzzle Requires Account
          </h1>
          <p className="text-lg text-neutral-600">
            You&apos;re trying to play <span className="font-semibold text-cinema-red">Puzzle #{puzzleNumber}</span> of{" "}
            <span className="font-semibold">{gameName}</span> from {formattedDate}.
          </p>
        </div>

        {/* Why sign up section */}
        <div className="bg-neutral-50 rounded-lg p-6 space-y-4 border border-neutral-200">
          <p className="text-neutral-700 font-medium text-center">
            Access to archived puzzles requires a free account. Here&apos;s what you get:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Save className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Progress Saved</p>
                <p className="text-sm text-neutral-600">Never lose your game history</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Repeat className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Sync Across Devices</p>
                <p className="text-sm text-neutral-600">Play on phone, tablet, or desktop</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Detailed Statistics</p>
                <p className="text-sm text-neutral-600">Track your performance over time</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Film className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Access All Archives</p>
                <p className="text-sm text-neutral-600">Play any past puzzle anytime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Future features teaser */}
        <p className="text-center text-sm text-neutral-500 italic">
          Coming soon: Leaderboards, achievements, and more!
        </p>

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <Button
            asChild
            className="w-full h-14 text-lg font-bold bg-cinema-red hover:bg-cinema-red/90 shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]"
          >
            <a href={`/auth/sign-up?redirect=${encodeURIComponent(redirectUrl)}`}>
              Create Free Account
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full h-12 text-base border-2 border-neutral-300 hover:bg-neutral-50"
          >
            <a href={`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`}>
              Already have an account? Sign In
            </a>
          </Button>
        </div>

        {/* Footer info */}
        <p className="text-xs text-center text-neutral-500 pt-2">
          100% free • No credit card required • Sign up with email in 30 seconds
        </p>
      </div>
    </div>
  )
}