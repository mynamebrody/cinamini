"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CheckCircle, Play, DollarSign, Globe, Film, Image, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import AuthDialog from "./auth-dialog"

interface GameCardProps {
  id: string
  name: string
  description: string
  hasPlayedToday: boolean
  featured?: boolean
  isAuthenticated?: boolean
}

export default function GameCard({ 
  id, 
  name, 
  description, 
  hasPlayedToday, 
  featured = false, 
  isAuthenticated = false 
}: GameCardProps) {
  const router = useRouter()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const handlePlay = () => {
    if (isAuthenticated) {
      router.push(`/game/${id}`)
    } else {
      setShowAuthDialog(true)
    }
  }

  const getGameIcon = () => {
    const iconClass = cn("flex-shrink-0", featured ? "w-8 h-8" : "w-6 h-6")
    
    switch (id) {
      case 'budget-bracket':
        return <DollarSign className={cn(iconClass, "text-emerald-500")} />
      case 'retitled':
        return <Globe className={cn(iconClass, "text-blue-500")} />
      case 'poster-pixels':
        return <Image className={cn(iconClass, "text-purple-500")} />
      case 'cast-climb':
        return <Users className={cn(iconClass, "text-orange-500")} />
      default:
        return <Film className={cn(iconClass, "text-neutral-500")} />
    }
  }

  const getFeatureStyles = () => {
    if (!featured) return ""
    
    switch (id) {
      case 'budget-bracket':
        return "bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
      case 'retitled':
        return "bg-gradient-to-br from-blue-50 to-white border-blue-200"
      case 'poster-pixels':
        return "bg-gradient-to-br from-purple-50 to-white border-purple-200"
      case 'cast-climb':
        return "bg-gradient-to-br from-orange-50 to-white border-orange-200"
      default:
        return "bg-gradient-to-br from-neutral-50 to-white"
    }
  }

  if (featured) {
    return (
      <Card className={cn(
        "featured-card p-8 relative overflow-hidden group cursor-pointer",
        getFeatureStyles()
      )}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {getGameIcon()}
              <div>
                <h3 className="font-nyt text-2xl font-bold text-neutral-900 mb-2">
                  {name}
                </h3>
                <p className="text-neutral-600 text-lg leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            {hasPlayedToday && (
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Completed
                </span>
              </div>
            )}
          </div>

          {/* Play Button */}
          <Button
            onClick={handlePlay}
            size="lg"
            variant={hasPlayedToday ? "secondary" : "primary"}
            className="w-full h-12 text-base font-semibold transition-all"
          >
            {hasPlayedToday ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                View Results
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {isAuthenticated ? "Play Today's Puzzle" : "Start Playing"}
              </>
            )}
          </Button>
        </div>
        
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
          gameName={name}
        />
      </Card>
    )
  }

  // Regular card design
  return (
    <Card className="card-hover p-6 cursor-pointer group">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getGameIcon()}
            <div>
              <h3 className="font-semibold text-lg text-neutral-900 mb-1">
                {name}
              </h3>
              <p className="text-neutral-600 text-sm">
                {description}
              </p>
            </div>
          </div>
          {hasPlayedToday && (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
        </div>
        
        <Button
          onClick={handlePlay}
          variant={hasPlayedToday ? "secondary" : "primary"}
          size="md"
          className="w-full"
        >
          {hasPlayedToday ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              View Results
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play
            </>
          )}
        </Button>
      </div>
      
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        gameName={name}
      />
    </Card>
  )
}