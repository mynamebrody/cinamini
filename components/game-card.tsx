"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CheckCircle2, PlayCircle, DollarSign, Globe, Film } from "lucide-react"
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

export default function GameCard({ id, name, description, hasPlayedToday, featured = false, isAuthenticated = false }: GameCardProps) {
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
    switch (id) {
      case 'budget-bracket':
        return <DollarSign className={cn("text-green-400", featured ? "w-6 h-6" : "w-5 h-5")} />
      case 'retitled':
        return <Globe className={cn("text-blue-400", featured ? "w-6 h-6" : "w-5 h-5")} />
      default:
        return <Film className={cn("text-gray-400", featured ? "w-6 h-6" : "w-5 h-5")} />
    }
  }

  const getGameGradient = () => {
    switch (id) {
      case 'budget-bracket':
        return featured ? "from-green-500/10 to-transparent" : ""
      case 'retitled':
        return featured ? "from-blue-500/10 to-transparent" : ""
      default:
        return ""
    }
  }

  return (
    <Card className={cn(
      "bg-[#1c1c1c] border-white/10 hover:border-white/20 transition-all relative overflow-hidden",
      "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
      featured 
        ? "p-8 md:p-10 border-2 hover:border-[#B31B1B]/40 shadow-xl" 
        : "p-6"
    )}>
      {/* Background gradient for featured cards */}
      {featured && getGameGradient() && (
        <div className={cn("absolute inset-0 bg-gradient-to-br", getGameGradient())} />
      )}
      
      <div className={cn("relative space-y-4", featured && "space-y-6")}>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {getGameIcon()}
              <h3 className={cn(
                "font-bold text-white",
                featured ? "text-2xl md:text-3xl" : "text-xl"
              )}>
                {name}
              </h3>
            </div>
            <p className={cn(
              "text-gray-400",
              featured ? "text-base md:text-lg" : "text-sm"
            )}>
              {description}
            </p>
          </div>
          {hasPlayedToday && (
            <CheckCircle2 className={cn(
              "text-green-500 flex-shrink-0",
              featured ? "w-6 h-6" : "w-5 h-5"
            )} />
          )}
        </div>
        
        <Button
          onClick={handlePlay}
          size={featured ? "lg" : "default"}
          className={cn(
            "w-full",
            featured && "py-3 text-lg",
            hasPlayedToday 
              ? "bg-white/10 text-white hover:bg-white/20" 
              : featured
                ? "bg-[#B31B1B] text-white hover:bg-[#9A1A1A]"
                : "bg-white text-black hover:bg-gray-200"
          )}
        >
          {hasPlayedToday ? (
            <>
              <CheckCircle2 className={cn("mr-2", featured ? "w-5 h-5" : "w-4 h-4")} />
              View Result
            </>
          ) : (
            <>
              <PlayCircle className={cn("mr-2", featured ? "w-5 h-5" : "w-4 h-4")} />
              {isAuthenticated ? "Play Now" : "Play Game"}
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