"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShareDrawer } from "@/components/ui/share-drawer"
import { 
  Trophy, 
  BarChart3, 
  CheckCircle,
  XCircle,
  Star,
  Target,
  Flame
} from "lucide-react"
import Image from "next/image"

interface CastClimbActor {
  name: string
  character: string
  order: number
  profile_path: string | null
  tmdb_id: number
}

interface CastClimbPuzzle {
  id: string
  puzzleDate: string
  puzzleNumber: number
  filmId: number
  filmTitle: string
  filmPosterUrl: string | null
  filmReleaseYear: number
  actors: CastClimbActor[]
  totalActors: number
  difficultyLevel: number
  funFact: string | null
}

interface CastClimbGuess {
  id: string
  guessFilmId: number
  guessFilmTitle: string
  guessFilmYear?: string | null
  isCorrect: boolean
  actorsRevealed: number
  solveTimeMs: number | null
  attemptNumber: number
  createdAt: string
}

interface CastClimbResult {
  correct: boolean
  puzzle: CastClimbPuzzle
  user_guesses: CastClimbGuess[]
  stats: {
    games_played: number
    games_won: number
    current_streak: number
    longest_streak: number
    perfect_games: number
    average_actors_revealed: number
  }
  share_text: string
}

interface CastClimbResultProps {
  result: CastClimbResult
  onPlayAgain?: () => void
  onViewStats?: () => void
}

export default function CastClimbResult({ result, onPlayAgain, onViewStats }: CastClimbResultProps) {
  const { correct, puzzle, user_guesses, stats, share_text } = result


  const lastGuess = user_guesses[user_guesses.length - 1]
  const isPerfectGame = correct && lastGuess.actorsRevealed === 1

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Main Result Card */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            {correct ? (
              <CheckCircle className="w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="w-12 h-12 text-cinema-red" />
            )}
          </div>
          <CardTitle className={correct ? "text-green-600" : "text-cinema-red"}>
            {correct ? "Congratulations!" : "Better luck tomorrow!"}
          </CardTitle>
          <p className="text-muted-foreground">
            {puzzle.filmTitle} ({puzzle.filmReleaseYear})
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {/* Your Guesses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your Guesses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user_guesses.map((guess) => (
                <div 
                  key={guess.id} 
                  className={`flex items-center justify-between text-sm bg-white p-3 border ${
                    guess.isCorrect 
                      ? 'border-green-500 shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94),3px_3px_0px_rgb(34,197,94),4px_4px_0px_rgb(34,197,94)]' 
                      : 'border-[rgb(153,37,29)] shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-2">
                    {guess.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-cinema-red" />
                    )}
                    <span className="truncate max-w-32">
                      {guess.guessFilmTitle === "_NEXT_HINT_SKIP_" || guess.guessFilmTitle === "_GIVE_UP_" ? (
                        <strong>Skipped</strong>
                      ) : (
                        `${guess.guessFilmTitle}${guess.guessFilmYear && guess.guessFilmYear !== 'Unknown' ? ` (${guess.guessFilmYear})` : ''}`
                      )}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {guess.actorsRevealed} actor{guess.actorsRevealed !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Movie Poster */}
          {puzzle.filmPosterUrl && (
            <div className="flex justify-center">
              <div className="border border-[#3a3a3c] shadow-[1px_1px_0px_rgb(58,58,60),2px_2px_0px_rgb(58,58,60),3px_3px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60)]" style={{ borderRadius: 0 }}>
                <Image 
                  src={`https://image.tmdb.org/t/p/w500${puzzle.filmPosterUrl}`} 
                  alt={`${puzzle.filmTitle} poster`}
                  width={200} 
                  height={300} 
                  className="block"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
          )}

          {/* Fun Fact */}
          {puzzle.funFact && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground italic">
                💡 {puzzle.funFact}
              </p>
            </div>
          )}

          {/* Performance Badges */}
          <div className="flex justify-center gap-2 flex-wrap">
            {isPerfectGame && (
              <Badge variant="secondary" className="text-yellow-600">
                <Star className="w-3 h-3 mr-1" />
                Perfect!
              </Badge>
            )}
            {correct && lastGuess.actorsRevealed <= 2 && (
              <Badge variant="secondary" className="text-blue-600">
                <Target className="w-3 h-3 mr-1" />
                Quick Guess
              </Badge>
            )}
            {stats.current_streak >= 3 && (
              <Badge variant="secondary" className="text-orange-600">
                <Flame className="w-3 h-3 mr-1" />
                {stats.current_streak} Streak
              </Badge>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Stats Summary Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold">{stats.games_played}</div>
              <div className="text-xs text-muted-foreground">Played</div>
            </div>
            <div>
              <div className="text-lg font-bold">{stats.games_won}</div>
              <div className="text-xs text-muted-foreground">Won</div>
            </div>
            <div>
              <div className="text-lg font-bold">{stats.current_streak}</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Share Preview */}
        <div className="bg-gradient-to-b from-gray-50 to-gray-100 border border-[#d1d2d4] p-4 text-center mb-3" style={{ borderRadius: 0 }}>
          {(() => {
            const lines = share_text.split('\n')
            const firstLine = lines[0] || ''
            const remainingLines = lines.slice(1)
            
            // Parse first line to extract title and emoji pattern
            const titleMatch = firstLine.match(/^(.*?#\d+)\s+(.*)$/)
            if (titleMatch) {
              const gameTitle = titleMatch[1] // "Cast Climb #12"
              const emojiPattern = titleMatch[2] // "❌❌❌✅"
              
              return (
                <>
                  <p className="font-mono text-lg mb-2">{gameTitle}</p>
                  <p className="font-mono text-2xl mb-2">{emojiPattern}</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {remainingLines.join(' ')}
                  </p>
                </>
              )
            }
            
            // Fallback if parsing fails
            return (
              <>
                <p className="font-mono text-lg mb-1">{firstLine}</p>
                {remainingLines.map((line, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {line}
                  </p>
                ))}
              </>
            )
          })()}
        </div>
        
        <ShareDrawer 
          shareText={share_text}
          shareUrl="https://cinamini.app/game/cast-climb"
          title="Share Your Cast Climb Results"
          description="Show off your movie knowledge!"
        />

        <div className="grid grid-cols-2 gap-2">
          {onViewStats && (
            <Button 
              onClick={onViewStats}
              variant="outline"
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Stats
            </Button>
          )}
          {onPlayAgain && (
            <Button 
              onClick={onPlayAgain}
              variant="outline"
              size="sm"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Tomorrow
            </Button>
          )}
        </div>
      </div>

    </div>
  )
}