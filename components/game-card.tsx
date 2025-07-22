"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CheckCircle2, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface GameCardProps {
  id: string
  name: string
  description: string
  hasPlayedToday: boolean
}

export default function GameCard({ id, name, description, hasPlayedToday }: GameCardProps) {
  const router = useRouter()

  const handlePlay = () => {
    router.push(`/game/${id}`)
  }

  return (
    <Card className={cn(
      "p-6 bg-[#1c1c1c] border-white/10 hover:border-white/20 transition-all",
      "hover:shadow-lg hover:scale-[1.02] cursor-pointer"
    )}>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">{name}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
          {hasPlayedToday && (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
        </div>
        
        <Button
          onClick={handlePlay}
          className={cn(
            "w-full",
            hasPlayedToday 
              ? "bg-white/10 text-white hover:bg-white/20" 
              : "bg-white text-black hover:bg-gray-200"
          )}
        >
          {hasPlayedToday ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              View Result
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Play Now
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}