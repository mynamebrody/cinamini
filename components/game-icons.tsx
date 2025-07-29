import { DollarSign, Globe, Film, Users } from "lucide-react"

interface GameIconProps {
  gameId: string
  className?: string
}

export function GameIcon({ gameId, className = "w-6 h-6" }: GameIconProps) {
  switch (gameId) {
    case 'budget-bracket':
      return <DollarSign className={className} />
    case 'retitled':
      return <Globe className={className} />
    case 'cast-climb':
      return <Users className={className} />
    default:
      return <Film className={className} />
  }
}

export function getGameEmoji(gameId: string): string {
  switch (gameId) {
    case 'budget-bracket':
      return '💰'
    case 'retitled':
      return '🌍'
    case 'cast-climb':
      return '🎭'
    default:
      return '🎬'
  }
}