import { DollarSign, Globe, Film, Users } from "lucide-react"
import { GameLogo } from "./game-logo"

interface GameIconProps {
  gameId: string
  className?: string
}

export function GameIcon({ gameId, className = "w-6 h-6" }: GameIconProps) {
  const size = 24 // Default size for icons
  
  switch (gameId) {
    case 'budget-bracket':
      return (
        <GameLogo
          logo="/cinamini/games/BudgetBracketPoster.svg"
          logoPng="/cinamini/games/BudgetBracketPoster.png"
          emoji="💰"
          alt="Budget Bracket"
          width={size}
          height={size}
          className={className}
        />
      )
    case 'retitled':
      return (
        <GameLogo
          logo="/cinamini/games/RetitledPoster.svg"
          logoPng="/cinamini/games/RetitledPoster.png"
          emoji="🌍"
          alt="Retitled"
          width={size}
          height={size}
          className={className}
        />
      )
    case 'cast-climb':
      return (
        <GameLogo
          logo="/cinamini/games/CastClimbPoster.svg"
          logoPng="/cinamini/games/CastClimbPoster.png"
          emoji="🎭"
          alt="Cast Climb"
          width={size}
          height={size}
          className={className}
        />
      )
    case 'poster-pixels':
      return (
        <GameLogo
          logo="/cinamini/games/PosterPixelsPoster.svg"
          logoPng="/cinamini/games/PosterPixelsPoster.png"
          emoji="🖼️"
          alt="Poster Pixels"
          width={size}
          height={size}
          className={className}
        />
      )
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

export function getGameLogo(gameId: string): string | null {
  switch (gameId) {
    case 'retitled':
      return '/cinamini/games/RetitledPoster.svg'
    case 'cast-climb':
      return '/cinamini/games/CastClimbPoster.svg'
    case 'budget-bracket':
      return '/cinamini/games/BudgetBracketPoster.svg'
    case 'poster-pixels':
      return '/cinamini/games/PosterPixelsPoster.svg'
    default:
      return null
  }
}

export function getGameLogoPng(gameId: string): string | null {
  switch (gameId) {
    case 'retitled':
      return '/cinamini/games/RetitledPoster.png'
    case 'cast-climb':
      return '/cinamini/games/CastClimbPoster.png'
    case 'budget-bracket':
      return '/cinamini/games/BudgetBracketPoster.png'
    case 'poster-pixels':
      return '/cinamini/games/PosterPixelsPoster.png'
    default:
      return null
  }
}