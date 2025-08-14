"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, TrendingUp, Users, Calendar, Shield, Star } from "lucide-react"
import { localGameStorage } from "@/lib/local-game-storage"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface AnonymousResultNudgeProps {
  gameResult: any
  gameName: string
  className?: string
}

interface NudgeContent {
  title: string
  subtitle: string
  features: Array<{
    icon: React.ComponentType<{ className?: string }>
    text: string
  }>
  ctaText: string
  variant: "subtle" | "moderate" | "strong"
}

export default function AnonymousResultNudge({ 
  gameResult, 
  gameName,
  className 
}: AnonymousResultNudgeProps) {
  const router = useRouter()
  const [nudgeContent, setNudgeContent] = useState<NudgeContent | null>(null)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const playCount = localGameStorage.getPlayCount()
    const todaysGames = localGameStorage.getTodaysGamesCount()
    const currentStreak = localGameStorage.getStats().streakData.current
    const daysPlayed = localGameStorage.getDaysPlayed()

    // Determine nudge content based on play patterns
    let content: NudgeContent | null = null

    if (playCount === 1) {
      // First play - no nudge
      setShouldShow(false)
      return
    } else if (playCount <= 3) {
      // Light nudge after first few games
      content = {
        title: "Nice work!",
        subtitle: "Create an account to save your progress",
        features: [
          { icon: Trophy, text: "Track your daily results" },
          { icon: TrendingUp, text: "See your stats over time" }
        ],
        ctaText: "Sign up free",
        variant: "subtle"
      }
    } else if (currentStreak >= 3 || playCount >= 7) {
      // Stronger nudge for engaged players
      content = {
        title: `You're on a ${currentStreak}-day streak!`,
        subtitle: "Don't lose your progress - create an account to save it",
        features: [
          { icon: Calendar, text: `Save your ${currentStreak}-day streak` },
          { icon: Trophy, text: "Keep all your game history" },
          { icon: Users, text: "Compare with friends" }
        ],
        ctaText: "Secure your streak",
        variant: "moderate"
      }
    } else if (daysPlayed >= 7) {
      // Major nudge for long-term players
      content = {
        title: "You've been playing for a week!",
        subtitle: "Your local data is at risk. Sign up to protect your progress forever.",
        features: [
          { icon: Shield, text: "Never lose your data" },
          { icon: Star, text: "Unlock achievement badges" },
          { icon: TrendingUp, text: "Get detailed statistics" },
          { icon: Users, text: "Join the leaderboard" }
        ],
        ctaText: "Create account now",
        variant: "strong"
      }
    } else if (todaysGames >= 3) {
      // Nudge for playing multiple games in one day
      content = {
        title: "Movie buff spotted!",
        subtitle: "You've played multiple games today. Track all your progress!",
        features: [
          { icon: Trophy, text: "Save results for all games" },
          { icon: TrendingUp, text: "Compare performance across games" }
        ],
        ctaText: "Start tracking",
        variant: "subtle"
      }
    }

    if (content) {
      setNudgeContent(content)
      setShouldShow(true)
    }
  }, [gameResult])

  if (!shouldShow || !nudgeContent) {
    return null
  }

  const handleSignUp = () => {
    router.push("/auth/sign-up")
  }

  const getVariantStyles = () => {
    switch (nudgeContent.variant) {
      case "strong":
        return "bg-gradient-to-b from-red-50 to-white"
      case "moderate":
        return "bg-gradient-to-b from-orange-50 to-white"
      case "subtle":
        return "bg-white"
      default:
        return "bg-white"
    }
  }

  const getBorderStyle = () => {
    switch (nudgeContent.variant) {
      case "strong":
        return { border: '1px solid #99251d' } // cinema-red
      case "moderate":
        return { border: '1px solid #fdba74' } // orange-300
      case "subtle":
        return { border: '1px solid #d1d2d4' } // silver
      default:
        return { border: '1px solid #d1d2d4' } // silver
    }
  }

  return (
    <Card 
      className={cn(
        "p-6 mt-6",
        getVariantStyles(),
        className
      )}
      style={getBorderStyle()}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            {nudgeContent.title}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            {nudgeContent.subtitle}
          </p>
        </div>

        <div className="space-y-2">
          {nudgeContent.features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-cinema-red flex-shrink-0" />
                <span className="text-sm text-neutral-700">{feature.text}</span>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleSignUp}
            variant={nudgeContent.variant === "strong" ? "primary" : "default"}
            className="flex-1"
          >
            {nudgeContent.ctaText}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShouldShow(false)}
            className="text-neutral-500 hover:text-[#99251d]"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </Card>
  )
}